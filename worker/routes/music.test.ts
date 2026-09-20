import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../index";

const CACHE_KEY = "cache:spotify:currently_playing";

async function seedCache(data: unknown, cachedAt: number): Promise<void> {
	await env.RATE_LIMITER.put(
		CACHE_KEY,
		JSON.stringify({ data, cached_at: cachedAt }),
	);
}

async function getMusic(): Promise<Response> {
	const ctx = createExecutionContext();
	const res = await worker.fetch(
		new Request("https://test/api/music"),
		env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return res;
}

describe("/api/music cache tiers", () => {
	it("serves fresh playing cache as HIT without upstream", async () => {
		await seedCache(
			{ is_playing: true, title: "Fresh Track", timestamp: Date.now() },
			Date.now(),
		);
		const res = await getMusic();
		expect(res.status).toBe(200);
		expect(res.headers.get("X-Cache-Status")).toBe("HIT");
		expect(res.headers.get("X-Playback-Status")).toBe("playing");
		const body = (await res.json()) as { title?: string };
		expect(body.title).toBe("Fresh Track");
	});

	it("serves expired playing cache as STALE", async () => {
		await seedCache(
			{ is_playing: true, title: "Stale Track", timestamp: Date.now() },
			Date.now() - 60_000,
		);
		const res = await getMusic();
		expect(res.status).toBe(200);
		expect(res.headers.get("X-Cache-Status")).toBe("STALE");
		const body = (await res.json()) as { title?: string };
		expect(body.title).toBe("Stale Track");
	});

	it("rejects non-GET methods", async () => {
		const ctx = createExecutionContext();
		const res = await worker.fetch(
			new Request("https://test/api/music", { method: "POST" }),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(res.status).toBe(405);
	});
});
