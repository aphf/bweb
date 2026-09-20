import type { Env } from "../env";
import { verifyAuth } from "../lib/auth";
import { json, methodNotAllowed } from "../lib/json";
import { checkRateLimit } from "../lib/rate-limit";

export async function handleNotesList(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		if (request.method === "GET") {
			const url = new URL(request.url);
			const search = url.searchParams.get("search");

			let results: Record<string, unknown>[];
			if (search) {
				const { results: r } = await env.DB.prepare(
					`SELECT filename, created_at, updated_at, length(content) as size,
					(SELECT author_name FROM note_edits WHERE note_id = notes.id ORDER BY created_at ASC LIMIT 1) as author
					FROM notes WHERE filename LIKE ? ORDER BY updated_at DESC`,
				)
					.bind(`%${search}%`)
					.all();
				results = r;
			} else {
				const { results: r } = await env.DB.prepare(
					`SELECT filename, created_at, updated_at, length(content) as size,
					(SELECT author_name FROM note_edits WHERE note_id = notes.id ORDER BY created_at ASC LIMIT 1) as author
					FROM notes ORDER BY updated_at DESC LIMIT 100`,
				).all();
				results = r;
			}

			return json(results);
		}

		if (request.method === "POST") {
			const { filename, content, commit_msg, author_name } =
				(await request.json()) as {
					filename?: string;
					content?: string;
					commit_msg?: string;
					author_name?: string;
				};

			if (!filename) return json({ error: "Filename required" }, 400);
			if (filename.length > 150)
				return json({ error: "Filename too long (max 150 chars)" }, 400);
			if (content && content.length > 10485760)
				return json({ error: "Content too large (max 10MB)" }, 400);

			const ip = request.headers.get("CF-Connecting-IP") || "unknown";

			const allowed = await checkRateLimit(env, `create_note:${ip}`, 10, 60);
			if (!allowed) {
				return json({ error: "Rate limit exceeded. Please wait." }, 429);
			}

			const id = crypto.randomUUID();
			const now = Date.now();
			const cf = (
				request as unknown as {
					cf?: { city?: string; country?: string; timezone?: string };
				}
			).cf;
			const city = cf?.city || "unknown";
			const country = cf?.country || "unknown";
			const userAgent = request.headers.get("User-Agent") || "unknown";
			const timezone = cf?.timezone || "UTC";

			await env.DB.batch([
				env.DB.prepare(
					`INSERT INTO notes (id, filename, content, ip, city, country, timezone, user_agent, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				).bind(
					id,
					filename,
					content,
					ip,
					city,
					country,
					timezone,
					userAgent,
					now,
					now,
				),
				env.DB.prepare(
					`INSERT INTO note_edits (id, note_id, previous_content, ip, city, country, created_at, commit_msg, author_name)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				).bind(
					crypto.randomUUID(),
					id,
					"",
					ip,
					city,
					country,
					now,
					commit_msg || "Initial commit",
					author_name || null,
				),
			]);

			return json({ success: true, filename });
		}

		return methodNotAllowed(["GET", "POST"]);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
			return json({ error: "File already exists" }, 409);
		}
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}

export async function handleNoteByFilename(
	request: Request,
	env: Env,
	filename: string,
): Promise<Response> {
	try {
		if (request.method === "GET") {
			const note = await env.DB.prepare(
				"SELECT id, filename, content, country, created_at, updated_at FROM notes WHERE filename = ?",
			)
				.bind(filename)
				.first();

			if (!note) {
				return json({ error: "Not found" }, 404);
			}

			return json(note);
		}

		if (request.method === "PUT") {
			const ip = request.headers.get("CF-Connecting-IP") || "unknown";

			const allowed = await checkRateLimit(env, `update_note:${ip}`, 10, 60);
			if (!allowed) {
				return json({ error: "Rate limit exceeded. Please wait." }, 429);
			}

			const { content, commit_msg, author_name } = (await request.json()) as {
				content?: string;
				commit_msg?: string;
				author_name?: string;
			};

			if (content == null) return json({ error: "Content required" }, 400);
			if (content.length > 10485760)
				return json({ error: "Content too large (max 10MB)" }, 400);

			const now = Date.now();
			const cf = (
				request as unknown as { cf?: { city?: string; country?: string } }
			).cf;
			const city = cf?.city || "unknown";
			const country = cf?.country || "unknown";

			const currentNote = await env.DB.prepare(
				"SELECT id, content FROM notes WHERE filename = ?",
			)
				.bind(filename)
				.first<{ id: string; content: string }>();

			if (currentNote) {
				const editId = crypto.randomUUID();
				await env.DB.prepare(
					"INSERT INTO note_edits (id, note_id, previous_content, ip, city, country, created_at, commit_msg, author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
				)
					.bind(
						editId,
						currentNote.id,
						currentNote.content,
						ip,
						city,
						country,
						now,
						commit_msg || null,
						author_name || null,
					)
					.run();
			}

			const info = await env.DB.prepare(
				"UPDATE notes SET content = ?, updated_at = ? WHERE filename = ?",
			)
				.bind(content, now, filename)
				.run();

			if (info.meta.changes === 0) {
				return json({ error: "File not found" }, 404);
			}

			return json({ success: true });
		}

		if (request.method === "DELETE") {
			if (!(await verifyAuth(request, env))) {
				return json({ error: "Unauthorized" }, 401);
			}

			const note = await env.DB.prepare(
				"SELECT id FROM notes WHERE filename = ?",
			)
				.bind(filename)
				.first<{ id: string }>();
			if (!note) {
				return json({ error: "Note not found" }, 404);
			}

			await env.DB.batch([
				env.DB.prepare("DELETE FROM note_edits WHERE note_id = ?").bind(
					note.id,
				),
				env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(note.id),
			]);

			return json({ success: true });
		}

		return methodNotAllowed(["GET", "PUT", "DELETE"]);
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}
