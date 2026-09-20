const UPSTREAM_SCRIPT = "https://cloud.umami.is/script.js";
const UPSTREAM_SEND = "https://gateway.umami.is/api/send";
const UPSTREAM_COLLECT = "https://gateway.umami.is/api/collect";

export async function handleAnalyticsScript(
	request: Request,
): Promise<Response> {
	if (request.method !== "GET") {
		return new Response("Method not allowed", {
			status: 405,
			headers: { Allow: "GET" },
		});
	}

	try {
		const upstream = await fetch(UPSTREAM_SCRIPT, {
			headers: { "User-Agent": "Neosphere-Proxy/1.0" },
		});

		if (!upstream.ok) {
			return new Response("Upstream unavailable", {
				status: 502,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const body = await upstream.text();
		const rewritten = body
			.replaceAll("https:\\/\\/gateway.umami.is", "")
			.replaceAll("https://gateway.umami.is", "")
			.replaceAll("https:\\/\\/cloud.umami.is", "")
			.replaceAll("https://cloud.umami.is", "")
			.replaceAll("https:\\/\\/api-gateway.umami.dev", "")
			.replaceAll("https://api-gateway.umami.dev", "");
		return new Response(rewritten, {
			status: 200,
			headers: {
				"Content-Type": "application/javascript; charset=utf-8",
				"Cache-Control": "public, max-age=86400, s-maxage=86400",
			},
		});
	} catch {
		return new Response("Upstream unavailable", {
			status: 502,
			headers: { "Cache-Control": "no-store" },
		});
	}
}

export async function handleAnalyticsSend(request: Request): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	}

	if (request.method !== "POST") {
		return new Response("Method not allowed", {
			status: 405,
			headers: { Allow: "POST, OPTIONS" },
		});
	}

	const url = new URL(request.url);
	const upstreamUrl = url.pathname.endsWith("/collect")
		? UPSTREAM_COLLECT
		: UPSTREAM_SEND;

	try {
		const headers = new Headers();
		const contentType = request.headers.get("content-type");
		if (contentType) headers.set("Content-Type", contentType);
		headers.set(
			"User-Agent",
			request.headers.get("user-agent") ?? "Mozilla/5.0",
		);

		const ip =
			request.headers.get("CF-Connecting-IP") ??
			request.headers.get("X-Forwarded-For");
		if (ip) {
			headers.set("X-Forwarded-For", ip);
			headers.set("X-Real-IP", ip.split(",")[0].trim());
		}

		const body = await request.arrayBuffer();

		const upstream = await fetch(upstreamUrl, {
			method: "POST",
			headers,
			body,
		});

		const respBody = await upstream.arrayBuffer();
		return new Response(respBody, {
			status: upstream.status,
			headers: {
				"Content-Type":
					upstream.headers.get("content-type") ?? "application/json",
				"Cache-Control": "no-store",
			},
		});
	} catch {
		return new Response(JSON.stringify({ error: "Upstream unavailable" }), {
			status: 502,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		});
	}
}
