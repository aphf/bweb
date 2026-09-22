import { kvGet, kvPut } from "./d1-kv";

export async function checkRateLimit(
	env: { DB?: D1Database },
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	if (!env.DB) {
		console.warn("DB not bound");
		return true;
	}

	const timeStep = Math.floor(Date.now() / 1000 / windowSeconds);
	const timeKey = `${key}:${timeStep}`;

	const val = await kvGet(env.DB, timeKey);
	const requestCount = val ? parseInt(val, 10) : 0;

	if (requestCount >= limit) {
		return false;
	}

	await kvPut(env.DB, timeKey, (requestCount + 1).toString(), {
		expirationTtl: windowSeconds * 2,
	});

	return true;
}
