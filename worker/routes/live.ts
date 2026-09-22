import type { Env } from "../env";
import { json } from "../lib/json";

function liveStub(env: Env) {
	return env.LIVE_COUNTER?.getByName("global") ?? null;
}

export async function handleLiveWebSocket(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}
	if (request.headers.get("Upgrade") !== "websocket") {
		return json({ error: "Expected Upgrade: websocket" }, 426);
	}
	const stub = liveStub(env);
	if (!stub) {
		return json({ error: "Live counter unavailable" }, 501);
	}
	return stub.fetch(request);
}

export async function handleLiveCount(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}
	const stub = liveStub(env);
	if (!stub) {
		return json({ live: 0 }, 200, {
			"Cache-Control": "no-store",
			"Cross-Origin-Resource-Policy": "same-origin",
		});
	}
	try {
		const live = (await stub.getCount()) as unknown;
		const n =
			typeof live === "number" && Number.isFinite(live) && live >= 0
				? Math.floor(live)
				: 0;
		return json({ live: n }, 200, {
			"Cache-Control": "no-store",
			"Cross-Origin-Resource-Policy": "same-origin",
		});
	} catch {
		return json({ live: 0 }, 200, { "Cache-Control": "no-store" });
	}
}
