export async function checkRateLimit(
	env: { RATE_LIMITER?: KVNamespace },
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	if (!env.RATE_LIMITER) {
		console.warn("RATE_LIMITER KV not bound");
		return true;
	}

	const timeStep = Math.floor(Date.now() / 1000 / windowSeconds);
	const timeKey = `${key}:${timeStep}`;

	const val = await env.RATE_LIMITER.get(timeKey);
	const requestCount = val ? parseInt(val, 10) : 0;

	if (requestCount >= limit) {
		return false;
	}

	await env.RATE_LIMITER.put(timeKey, (requestCount + 1).toString(), {
		expirationTtl: windowSeconds * 2,
	});

	return true;
}
