import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../index";

// NOTE: one single-line statement per exec — the D1 API truncates at newlines.
const SCHEMA_STATEMENTS = [
	"CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, filename TEXT UNIQUE, content TEXT, ip TEXT, city TEXT, country TEXT, timezone TEXT, user_agent TEXT, created_at INTEGER, updated_at INTEGER)",
	"CREATE TABLE IF NOT EXISTS note_edits (id TEXT PRIMARY KEY, note_id TEXT, previous_content TEXT, ip TEXT, city TEXT, country TEXT, created_at INTEGER, commit_msg TEXT, author_name TEXT, FOREIGN KEY(note_id) REFERENCES notes(id))",
	"CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, ip TEXT, user_agent TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, read BOOLEAN DEFAULT 0)",
	"CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)",
	"INSERT INTO config (key, value) VALUES ('notification_channels', 'none') ON CONFLICT(key) DO UPDATE SET value = 'none'",
];

async function setupSchema(): Promise<void> {
	for (const statement of SCHEMA_STATEMENTS) {
		await env.DB.exec(statement);
	}
}

async function call(
	path: string,
	init?: RequestInit,
): Promise<{ status: number; headers: Headers; body: unknown }> {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request(`https://test${path}`, init),
		env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	let body: unknown = null;
	try {
		body = await res.json();
	} catch {
		/* non-JSON bodies stay null */
	}
	return { status: res.status, headers: res.headers, body };
}

function postJson(path: string, data: unknown): ReturnType<typeof call> {
	return call(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

describe("API routing and validation", () => {
	beforeAll(setupSchema);

	it("rejects /api/x without a username and answers OPTIONS", async () => {
		const missing = await call("/api/x?username=");
		expect(missing.status).toBe(400);

		const options = await call("/api/x", { method: "OPTIONS" });
		expect(options.status).toBe(204);
		expect(options.headers.get("access-control-allow-origin")).toBe("*");
	});

	it("reports unauthenticated for /api/auth/check", async () => {
		const { status, body } = await call("/api/auth/check");
		expect(status).toBe(200);
		expect(body).toEqual({ authenticated: false });
	});

	it("returns 404 JSON for unknown API routes", async () => {
		const { status } = await call("/api/definitely-not-real");
		expect(status).toBe(404);
	});

	it("validates contact submissions before touching the DB", async () => {
		const { status } = await postJson("/api/contact", {});
		expect(status).toBe(400);
	});

	it("stores a contact message with notifications disabled", async () => {
		const { status, body } = await postJson("/api/contact", {
			name: "Test",
			email: "test@example.com",
			message: "hello",
		});
		expect(status).toBe(200);
		expect(body).toEqual({ success: true });
	});

	it("guards the inbox and admin config behind auth", async () => {
		expect((await call("/api/contact/inbox")).status).toBe(401);
		expect((await call("/api/admin/config")).status).toBe(401);
	});

	it("rejects /api/ai without a prompt before any upstream call", async () => {
		const { status } = await postJson("/api/ai", {});
		expect(status).toBe(400);
	});

	it("serves an empty gallery from local R2", async () => {
		const { status, body } = await call("/api/gallery");
		expect(status).toBe(200);
		expect(body).toEqual([]);
	});

	it("serves liveness on /api/health", async () => {
		const { status, body, headers } = await call("/api/health");
		expect(status).toBe(200);
		expect(body).toMatchObject({
			ok: true,
			checks: { kv: true, r2: true, d1: true, assets: true },
		});
		expect(headers.get("cache-control")).toContain("no-store");
	});
});

describe("notes CRUD", () => {
	const filename = "test-note.md";

	it("creates, reads, updates, and reads back a note", async () => {
		const create = await postJson("/api/notes", {
			filename,
			content: "v1",
		});
		expect(create.status).toBe(200);

		const list = await call("/api/notes");
		expect(list.status).toBe(200);
		expect(
			(list.body as { filename: string }[]).some(
				(n) => n.filename === filename,
			),
		).toBe(true);

		const update = await call(`/api/notes/${filename}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: "v2" }),
		});
		expect(update.status).toBe(200);

		const get = await call(`/api/notes/${filename}`);
		expect(get.status).toBe(200);
		expect((get.body as { content: string }).content).toBe("v2");
	});

	it("404s unknown notes and 401s deletes without auth", async () => {
		expect((await call("/api/notes/nope-missing.md")).status).toBe(404);
		const del = await call(`/api/notes/${filename}`, {
			method: "DELETE",
		});
		expect(del.status).toBe(401);
	});
});

describe("public_fs", () => {
	it("creates, lists, and deletes a file", async () => {
		const create = await postJson("/api/public_fs", {
			path: "test/hello.txt",
			type: "file",
			content: "hi",
		});
		expect(create.status).toBe(200);

		const get = await call("/api/public_fs?path=test/hello.txt");
		expect(get.status).toBe(200);
		expect((get.body as { content: string }).content).toBe("hi");

		const del = await call("/api/public_fs?path=test/hello.txt", {
			method: "DELETE",
		});
		expect(del.status).toBe(200);
	});
});
