import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
	it("allows up to the limit then denies", async () => {
		const key = `test:${crypto.randomUUID()}`;
		expect(await checkRateLimit(env, key, 2, 60)).toBe(true);
		expect(await checkRateLimit(env, key, 2, 60)).toBe(true);
		expect(await checkRateLimit(env, key, 2, 60)).toBe(false);
	});

	it("tracks keys independently", async () => {
		const prefix = crypto.randomUUID();
		expect(await checkRateLimit(env, `${prefix}:a`, 1, 60)).toBe(true);
		expect(await checkRateLimit(env, `${prefix}:a`, 1, 60)).toBe(false);
		expect(await checkRateLimit(env, `${prefix}:b`, 1, 60)).toBe(true);
	});

	it("passes open when the binding is missing", async () => {
		expect(await checkRateLimit({}, "any", 1, 60)).toBe(true);
	});
});
