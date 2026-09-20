import type { Env } from "../env";
import { verifyAuth } from "../lib/auth";
import { json } from "../lib/json";

async function ensureAiTable(db: D1Database): Promise<void> {
	await db
		.prepare(`
		CREATE TABLE IF NOT EXISTS ai_queries (
			id TEXT PRIMARY KEY,
			ip TEXT,
			user_agent TEXT,
			city TEXT,
			country TEXT,
			prompt TEXT NOT NULL,
			response TEXT NOT NULL,
			model TEXT NOT NULL,
			cost REAL DEFAULT 0,
			prompt_tokens INTEGER DEFAULT 0,
			completion_tokens INTEGER DEFAULT 0,
			is_admin INTEGER DEFAULT 0,
			created_at INTEGER NOT NULL
		)
	`)
		.run();

	try {
		await db
			.prepare("ALTER TABLE ai_queries ADD COLUMN is_admin INTEGER DEFAULT 0")
			.run();
	} catch {
		/* column already exists */
	}
}

export async function handleAi(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	try {
		const body = (await request.json().catch(() => ({}))) as {
			prompt?: string;
			messages?: Array<{
				role: "user" | "assistant" | "system";
				content: string;
			}>;
			model?: string;
		};

		const prompt = body.prompt?.trim();
		const inputMessages = body.messages;

		if (!prompt && (!inputMessages || inputMessages.length === 0)) {
			return json({ error: "Prompt or messages parameter is required." }, 400);
		}

		const lastPrompt =
			prompt ||
			(inputMessages && inputMessages.length > 0
				? inputMessages[inputMessages.length - 1].content
				: "");
		if (lastPrompt.length > 500) {
			return json(
				{ error: "Prompt exceeds maximum length of 500 characters." },
				400,
			);
		}

		const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
		const userAgent = request.headers.get("User-Agent") || "unknown";
		const cf = (
			request as unknown as { cf?: { city?: string; country?: string } }
		).cf;
		const city = cf?.city || "unknown";
		const country = cf?.country || "unknown";

		await ensureAiTable(env.DB);

		const isAdmin = await verifyAuth(request, env);

		if (!isAdmin) {
			const countResult = await env.DB.prepare(
				"SELECT COUNT(*) as total FROM ai_queries WHERE ip = ? AND is_admin = 0",
			)
				.bind(ip)
				.first<{ total: number }>();

			const userQueryCount = countResult?.total ?? 0;
			const MAX_QUERIES = 5;

			if (userQueryCount >= MAX_QUERIES) {
				return json(
					{
						error:
							"Query limit reached. You have used all available AI queries.",
						remaining: 0,
					},
					429,
				);
			}
		}

		const apiKey = env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return json(
				{ error: "OPENROUTER_API_KEY is not configured on the server." },
				500,
			);
		}

		const modelName =
			env.OPENROUTER_MODEL || body.model || "deepseek/deepseek-v4-flash-0731";

		const systemMessage = {
			role: "system",
			content: `You are Alaska, the friendly AI assistant for Neosphere OS, Bahauddin Alam's interactive Web Desktop Portfolio.

ABOUT BAHAUDDIN ALAM:
- Location: Patna, India (@bahauddinalam). Open to work.
- Roles: Full Stack Developer, Software Engineering Student, Open Source Contributor.
- Core Stack: React (95%), TypeScript (90%), Tailwind CSS (98%), Node.js (90%), Python (85%), Go (80%), Rust (75%), C++ (70%), AWS.
- Philosophy: Systems-first engineering shaped by C++ background. Focuses on high performance, clean architecture, and memory efficiency.
- Built: Neosphere OS (this desktop portfolio), server uptime monitoring tools, real-time health dashboards, developer alert systems.

GUIDELINES:
- Answer naturally, helpfully, and concisely (under 400 characters).
- Help visitors explore Bahauddin's skills, experience, portfolio projects, notes, gallery, and contact info.`,
		};

		const formattedMessages: Array<{ role: string; content: string }> = [
			systemMessage,
		];

		if (Array.isArray(inputMessages) && inputMessages.length > 0) {
			const history = inputMessages.slice(-10).map((msg) => ({
				role: msg.role === "assistant" ? "assistant" : "user",
				content: String(msg.content).slice(0, 1000),
			}));
			formattedMessages.push(...history);
		} else if (prompt) {
			formattedMessages.push({ role: "user", content: prompt });
		}

		const openrouterRes = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": "https://bahauddin.org",
					"X-Title": "Neosphere OS",
				},
				body: JSON.stringify({
					model: modelName,
					messages: formattedMessages,
					max_tokens: 400,
					stream: true,
					stream_options: { include_usage: true },
				}),
			},
		);

		if (!openrouterRes.ok || !openrouterRes.body) {
			const errText = await openrouterRes.text().catch(() => "");
			return json(
				{ error: `OpenRouter API error: ${errText}` },
				openrouterRes.status || 500,
			);
		}

		let accumulatedResponse = "";
		let promptTokens = 0;
		let completionTokens = 0;
		let directCost = 0;
		let sseBuffer = "";

		const textDecoder = new TextDecoder();
		const textEncoder = new TextEncoder();

		const transformStream = new TransformStream({
			transform(chunk, controller) {
				sseBuffer += textDecoder.decode(chunk, { stream: true });
				const lines = sseBuffer.split("\n");
				sseBuffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					if (trimmed === "data: [DONE]") {
						controller.enqueue(textEncoder.encode("data: [DONE]\n\n"));
						continue;
					}
					if (trimmed.startsWith("data: ")) {
						const rawData = trimmed.slice(6).trim();
						try {
							const parsed = JSON.parse(rawData);
							const delta = parsed.choices?.[0]?.delta;
							if (delta?.content) {
								accumulatedResponse += delta.content;
								controller.enqueue(
									textEncoder.encode(
										`data: ${JSON.stringify({ choices: [{ delta: { content: delta.content } }] })}\n\n`,
									),
								);
							}
							if (parsed.usage) {
								promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
								completionTokens =
									parsed.usage.completion_tokens ?? completionTokens;
								directCost = parsed.usage.cost ?? directCost;
							}
						} catch {
							/* ignore SSE parse chunk errors */
						}
					}
				}
			},
			flush() {
				ctx.waitUntil(
					(async () => {
						try {
							const recordId = crypto.randomUUID();
							const now = Date.now();

							await env.DB.prepare(`
								INSERT INTO ai_queries (id, ip, user_agent, city, country, prompt, response, model, cost, prompt_tokens, completion_tokens, is_admin, created_at)
								VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
							`)
								.bind(
									recordId,
									ip,
									userAgent,
									city,
									country,
									lastPrompt || "",
									accumulatedResponse || "",
									modelName,
									directCost || 0,
									promptTokens || 0,
									completionTokens || 0,
									isAdmin ? 1 : 0,
									now,
								)
								.run();
						} catch (dbErr) {
							console.error("Failed to insert into ai_queries:", dbErr);
						}
					})(),
				);
			},
		});

		void openrouterRes.body.pipeThrough(transformStream);

		return new Response(transformStream.readable, {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error occurred" },
			500,
		);
	}
}
