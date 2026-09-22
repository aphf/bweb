import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../index";
import { kvDelete, kvPut } from "../lib/d1-kv";

async function call(path: string, init?: RequestInit): Promise<Response> {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request(`https://test${path}`, init),
		env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return res;
}

describe("/api/visitors", () => {
	it("rejects non-GET methods", async () => {
		const res = await call("/api/visitors", { method: "POST" });
		expect(res.status).toBe(405);
	});

	it("handles cold cache with or without a token", async () => {
		await kvDelete(env.DB, "cache:visitors:v1");
		await kvDelete(env.DB, "lock:visitors:revalidate");
		const res = await call("/api/visitors");
		const cacheStatus = res.headers.get("X-Cache-Status");
		const body = (await res.json()) as { total: unknown };
		if (cacheStatus === "BYPASS") {
			expect(res.status).toBe(200);
			expect(body.total).toBeNull();
			expect(body).toEqual({ total: null });
		} else {
			expect(cacheStatus).toBe("MISS");
			if (res.status === 200) {
				expect(body.total).toEqual(expect.any(Number));
				expect(body).toEqual({ total: expect.any(Number) });
			} else {
				expect(res.status).toBe(502);
				expect(body.total).toBeNull();
			}
		}
		await kvDelete(env.DB, "cache:visitors:v1");
	});

	it("serves fresh KV cache as HIT without upstream", async () => {
		await kvPut(
			env.DB,
			"cache:visitors:v1",
			JSON.stringify({
				data: { total: 1234 },
				cached_at: Date.now(),
			}),
		);
		const res = await call("/api/visitors");
		expect(res.status).toBe(200);
		expect(res.headers.get("X-Cache-Status")).toBe("HIT");
		const body = (await res.json()) as { total: unknown };
		expect(body).toEqual({ total: 1234 });
		await kvDelete(env.DB, "cache:visitors:v1");
	});

	it("serves expired KV cache as STALE and revalidates in background", async () => {
		await kvPut(
			env.DB,
			"cache:visitors:v1",
			JSON.stringify({
				data: { total: 1234 },
				cached_at: Date.now() - 60_000,
			}),
		);
		const res = await call("/api/visitors");
		expect(res.status).toBe(200);
		expect(res.headers.get("X-Cache-Status")).toBe("STALE");
		const body = (await res.json()) as { total: unknown };
		expect(body).toEqual({ total: 1234 });
		await kvDelete(env.DB, "cache:visitors:v1");
		await kvDelete(env.DB, "lock:visitors:revalidate");
	});
});
