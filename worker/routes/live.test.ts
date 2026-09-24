import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../index";

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

describe("/api/live", () => {
	it("rejects non-websocket upgrades with 426", async () => {
		const res = await call("/api/live");
		expect(res.status).toBe(426);
	});

	it("rejects non-GET methods", async () => {
		const res = await call("/api/live", { method: "POST" });
		expect(res.status).toBe(405);
	});

	it("serves count as JSON", async () => {
		const res = await call("/api/live/count");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { live: unknown };
		expect(typeof body.live).toBe("number");
		expect(body.live as number).toBeGreaterThanOrEqual(0);
	});

	it("passes websocket upgrades through as 101", async () => {
		const res = await call("/api/live?cid=testcid123", {
			headers: { Upgrade: "websocket" },
		});
		expect(res.status).toBe(101);
	});
});
