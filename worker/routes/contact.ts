import * as React from "react";
import { render } from "react-email";
import { Resend } from "resend";
import ContactNotificationEmail from "../../emails/ContactNotification";
import type { Env } from "../env";
import { verifyAuth } from "../lib/auth";
import { json, methodNotAllowed } from "../lib/json";
import { checkRateLimit } from "../lib/rate-limit";

async function withRetry<T>(
	fn: () => Promise<T>,
	label: string,
	maxAttempts = 3,
	baseDelayMs = 500,
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err: unknown) {
			lastError = err instanceof Error ? err : new Error(String(err));
			console.error(
				`[${label}] Attempt ${attempt}/${maxAttempts} failed:`,
				lastError.message,
			);

			if (attempt < maxAttempts) {
				const delay = baseDelayMs * 2 ** (attempt - 1);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
	}

	throw lastError;
}

function escapeMarkdown(text: string): string {
	return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

async function sendTelegram(
	env: Env,
	chatId: string,
	name: string,
	email: string,
	message: string,
): Promise<void> {
	const text = `*New Message from* ${escapeMarkdown(name)}\nEmail: ${escapeMarkdown(email)}\n\n${escapeMarkdown(message)}`;
	const telegramUrl = `https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN)}/sendMessage`;

	const res = await fetch(telegramUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" }),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Telegram API ${res.status}: ${body}`);
	}
}

async function sendResendEmail(
	env: Env,
	name: string,
	email: string,
	message: string,
	metadata: {
		id?: number | string;
		ip?: string;
		city?: string;
		country?: string;
		userAgent?: string;
		timestamp?: string;
	},
): Promise<void> {
	const apiKey = String(env.RESEND_API_KEY || "");
	const to = String(env.CONTACT_EMAIL_TO || "");
	const from = String(env.CONTACT_EMAIL_FROM || "");

	const recipients = to
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	if (!apiKey || recipients.length === 0 || !from) {
		console.warn(
			"[Resend] Skipped email delivery: RESEND_API_KEY, CONTACT_EMAIL_TO, or CONTACT_EMAIL_FROM is not configured.",
		);
		return;
	}

	const resend = new Resend(apiKey);
	const emailElement = React.createElement(ContactNotificationEmail, {
		name,
		email,
		message,
		timestamp: metadata.timestamp || new Date().toUTCString(),
		ip: metadata.ip,
		city: metadata.city,
		country: metadata.country,
		userAgent: metadata.userAgent,
	});
	const [html, text] = await Promise.all([
		render(emailElement),
		render(emailElement, { plainText: true }),
	]);

	const idempotencyKey = metadata.id
		? `contact-submission/${metadata.id}`
		: `contact-submission/${crypto.randomUUID()}`;

	console.log(
		`[Resend] Sending email notification to ${recipients.join(", ")} via BCC (idempotency: ${idempotencyKey})`,
	);

	const { data, error } = await resend.emails.send(
		{
			from,
			to: [recipients[0]],
			bcc: recipients.length > 1 ? recipients.slice(1) : undefined,
			replyTo: email,
			subject: `${name} via bahauddin.org`,
			html,
			text,
		},
		{ idempotencyKey },
	);

	if (error) {
		throw new Error(`Resend error: ${error.name} - ${error.message}`);
	}

	console.log(`[Resend] Email delivered successfully. ID: ${data?.id}`);
}

export async function handleContactSubmit(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	try {
		const ip = request.headers.get("CF-Connecting-IP") || "unknown";

		const allowed = await checkRateLimit(env, `contact:${ip}`, 3, 3600);
		if (!allowed) {
			return json(
				{
					error:
						"Rate limit exceeded. Please wait before sending another message.",
				},
				429,
			);
		}

		const body = (await request.json()) as {
			name?: string;
			email?: string;
			message?: string;
		};
		const { name, email, message } = body;

		if (!name || !email || !message) {
			return json({ error: "Missing required fields" }, 400);
		}

		const userAgent = request.headers.get("User-Agent") || "unknown";
		const insertResult = await env.DB.prepare(
			"INSERT INTO messages (name, email, message, ip, user_agent) VALUES (?, ?, ?, ?, ?)",
		)
			.bind(name, email, message, ip, userAgent)
			.run();

		const messageId = insertResult.meta?.last_row_id;
		const submissionTimestamp = new Date().toUTCString();

		const configResult = await env.DB.prepare(
			"SELECT value FROM config WHERE key = 'notification_channels'",
		).first<{ value: string }>();
		const notificationChannels = (
			(configResult?.value as string) || "telegram,email"
		)
			.split(",")
			.map((s) => s.trim().toLowerCase());

		if (
			notificationChannels.includes("telegram") &&
			env.TELEGRAM_BOT_TOKEN &&
			env.TELEGRAM_CHAT_ID
		) {
			const chatIds = String(env.TELEGRAM_CHAT_ID).split(",");
			ctx.waitUntil(
				Promise.all(
					chatIds.map((chatId) =>
						withRetry(
							() => sendTelegram(env, chatId.trim(), name, email, message),
							`Telegram:${chatId}`,
							3,
							500,
						).catch((err) =>
							console.error(
								`[Telegram:${chatId}] All retries failed:`,
								err.message,
							),
						),
					),
				),
			);
		}

		if (notificationChannels.includes("email") && env.RESEND_API_KEY) {
			const cf = (
				request as unknown as { cf?: { city?: string; country?: string } }
			).cf;
			ctx.waitUntil(
				withRetry(
					() =>
						sendResendEmail(env, name, email, message, {
							id: messageId,
							ip,
							city: cf?.city,
							country: cf?.country,
							userAgent,
							timestamp: submissionTimestamp,
						}),
					"ResendEmail",
					3,
					1000,
				).catch((err) =>
					console.error("[ResendEmail] All retries failed:", err.message),
				),
			);
		}

		return json({ success: true });
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}

export async function handleInbox(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		if (!(await verifyAuth(request, env))) {
			return json({ error: "Unauthorized" }, 401);
		}

		if (request.method === "GET") {
			const url = new URL(request.url);
			const period = url.searchParams.get("period");
			const date = url.searchParams.get("date");

			let query = "SELECT * FROM messages";
			const params: string[] = [];
			const conditions: string[] = [];

			if (date) {
				conditions.push("date(timestamp) = ?");
				params.push(date);
			} else if (period) {
				const now = new Date();
				const past = new Date();
				if (period === "day") past.setDate(now.getDate() - 1);
				if (period === "week") past.setDate(now.getDate() - 7);
				if (period === "month") past.setMonth(now.getMonth() - 1);
				if (period === "year") past.setFullYear(now.getFullYear() - 1);

				conditions.push("timestamp >= datetime(?)");
				params.push(past.toISOString());
			}

			if (conditions.length > 0) {
				query += ` WHERE ${conditions.join(" AND ")}`;
			}

			query += " ORDER BY timestamp DESC LIMIT 100";

			const { results } = await env.DB.prepare(query)
				.bind(...params)
				.all();
			return json(results);
		}

		if (request.method === "DELETE") {
			const url = new URL(request.url);
			const id = url.searchParams.get("id");

			if (!id) {
				return json({ error: "Missing ID" }, 400);
			}

			const res = await env.DB.prepare("DELETE FROM messages WHERE id = ?")
				.bind(id)
				.run();

			if (res.meta.changes === 0) {
				return json({ error: "Message not found" }, 404);
			}

			return json({ success: true });
		}

		return methodNotAllowed(["GET", "DELETE"]);
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}
