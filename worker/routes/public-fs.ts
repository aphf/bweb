import type { Env } from "../env";
import { json, methodNotAllowed } from "../lib/json";
import { checkRateLimit } from "../lib/rate-limit";

interface PublicItem {
	path: string;
	type: "file" | "directory";
	content: string | null;
	size: number;
	author: string | null;
	updated_at: number;
}

async function ensureTable(db: D1Database): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS public (
				path TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				content TEXT,
				size INTEGER DEFAULT 0,
				author TEXT,
				updated_at INTEGER
			)`,
		)
		.run();
}

export async function handlePublicFs(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		await ensureTable(env.DB);

		if (request.method === "GET") {
			const url = new URL(request.url);
			const targetPath = url.searchParams.get("path");

			if (targetPath) {
				const item = await env.DB.prepare(
					"SELECT path, type, content, size, author, updated_at FROM public WHERE path = ?",
				)
					.bind(targetPath)
					.first<PublicItem>();

				if (!item) {
					return json({ error: "File not found" }, 404);
				}

				return json(item);
			}

			const { results } = await env.DB.prepare(
				"SELECT path, type, content, size, author, updated_at FROM public ORDER BY path ASC",
			).all<PublicItem>();

			return json(results || []);
		}

		if (request.method === "POST") {
			const ip = request.headers.get("CF-Connecting-IP") || "unknown";
			const allowed = await checkRateLimit(env, `public_fs:${ip}`, 60, 60);
			if (!allowed) {
				return json({ error: "Rate limit exceeded. Please wait." }, 429);
			}

			const body = (await request.json()) as {
				path?: string;
				type?: "file" | "directory";
				content?: string;
				author?: string;
			};

			const path = body.path?.trim().replace(/^\/+|\/+$/g, "");
			const type = body.type || "file";
			const content = body.content ?? "";
			const author = body.author || "neo";

			if (!path) return json({ error: "Path is required" }, 400);
			if (path.length > 255)
				return json({ error: "Path is too long (max 255 chars)" }, 400);
			if (content.length > 5242880)
				return json({ error: "Content too large (max 5MB)" }, 400);

			const now = Date.now();
			const size = type === "file" ? content.length : 4096;

			await env.DB.prepare(
				`INSERT INTO public (path, type, content, size, author, updated_at)
				VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(path) DO UPDATE SET
				type = excluded.type,
				content = excluded.content,
				size = excluded.size,
				author = excluded.author,
				updated_at = excluded.updated_at`,
			)
				.bind(path, type, type === "file" ? content : null, size, author, now)
				.run();

			return json({ success: true, path, type, size, updated_at: now });
		}

		if (request.method === "PUT") {
			const ip = request.headers.get("CF-Connecting-IP") || "unknown";
			const allowed = await checkRateLimit(env, `public_fs_mv:${ip}`, 40, 60);
			if (!allowed) {
				return json({ error: "Rate limit exceeded. Please wait." }, 429);
			}

			const body = (await request.json()) as {
				action?: "mv" | "cp";
				source?: string;
				destination?: string;
			};

			const src = body.source?.trim().replace(/^\/+|\/+$/g, "");
			const dest = body.destination?.trim().replace(/^\/+|\/+$/g, "");

			if (!src || !dest) {
				return json({ error: "source and destination required" }, 400);
			}

			const { results: items } = await env.DB.prepare(
				"SELECT path, type, content, size, author, updated_at FROM public WHERE path = ? OR path LIKE ?",
			)
				.bind(src, `${src}/%`)
				.all<PublicItem>();

			if (!items || items.length === 0) {
				return json({ error: `Source '${src}' not found` }, 404);
			}

			const now = Date.now();
			const batch: D1PreparedStatement[] = [];

			for (const item of items) {
				const subPath =
					item.path === src ? "" : item.path.substring(src.length + 1);
				const newPath = subPath ? `${dest}/${subPath}` : dest;

				batch.push(
					env.DB.prepare(
						`INSERT INTO public (path, type, content, size, author, updated_at)
						VALUES (?, ?, ?, ?, ?, ?)
						ON CONFLICT(path) DO UPDATE SET
						type = excluded.type,
						content = excluded.content,
						size = excluded.size,
						author = excluded.author,
						updated_at = excluded.updated_at`,
					).bind(newPath, item.type, item.content, item.size, item.author, now),
				);

				if (body.action === "mv") {
					batch.push(
						env.DB.prepare("DELETE FROM public WHERE path = ?").bind(item.path),
					);
				}
			}

			await env.DB.batch(batch);

			return json({
				success: true,
				action: body.action,
				source: src,
				destination: dest,
			});
		}

		if (request.method === "DELETE") {
			const url = new URL(request.url);
			const pathParam = url.searchParams.get("path");
			const recursive = url.searchParams.get("recursive") === "true";

			if (!pathParam) {
				return json({ error: "path parameter required" }, 400);
			}

			const cleanPath = pathParam.trim().replace(/^\/+|\/+$/g, "");

			if (recursive) {
				await env.DB.prepare("DELETE FROM public WHERE path = ? OR path LIKE ?")
					.bind(cleanPath, `${cleanPath}/%`)
					.run();
			} else {
				await env.DB.prepare("DELETE FROM public WHERE path = ?")
					.bind(cleanPath)
					.run();
			}

			return json({ success: true, path: cleanPath });
		}

		return methodNotAllowed(["GET", "POST", "PUT", "DELETE"]);
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}
