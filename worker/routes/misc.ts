import type { Env } from "../env";
import { json } from "../lib/json";

export async function handleStatus(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}

	const apiKey = env.STATUS_API_KEY;
	const apiUrl =
		env.STATUS_API_URL || "https://t.707101.xyz/api/servers/mintB/status";

	if (!apiKey) {
		return json(
			{
				success: false,
				error: "STATUS_API_KEY environment variable is not configured",
				server: null,
			},
			500,
			{ "Cache-Control": "no-store" },
		);
	}

	try {
		const response = await fetch(apiUrl, {
			method: "GET",
			headers: { "X-API-Key": apiKey, Accept: "application/json" },
		});

		if (!response.ok) {
			return json(
				{
					success: false,
					error: `Upstream status service responded with status ${response.status}`,
					server: null,
				},
				response.status,
				{ "Cache-Control": "no-store" },
			);
		}

		const upstream = (await response.json()) as {
			success?: boolean;
			server?: { is_online?: boolean; last_ping?: string };
		};

		return json(
			{
				success: Boolean(upstream?.success),
				server: upstream?.server
					? {
							is_online: Boolean(upstream.server.is_online),
							last_ping: upstream.server.last_ping || null,
						}
					: null,
			},
			200,
			{ "Cache-Control": "public, max-age=15, s-maxage=30" },
		);
	} catch (err: unknown) {
		return json(
			{
				success: false,
				error:
					err instanceof Error ? err.message : "Failed to fetch server status",
				server: null,
			},
			502,
			{ "Cache-Control": "no-store" },
		);
	}
}

export async function handleHealth(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}

	const checks = {
		kv: Boolean(env.RATE_LIMITER),
		r2: Boolean(env.neosphere_assets),
		d1: Boolean(env.DB),
		assets: Boolean(env.ASSETS),
	};
	const ok = checks.kv && checks.r2 && checks.d1 && checks.assets;

	return json({ ok, timestamp: Date.now(), checks }, ok ? 200 : 503, {
		"Cache-Control": "no-store",
	});
}

export async function handlePing(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const host = url.searchParams.get("host");

	if (!host) {
		return json({ error: "Host is required" }, 400);
	}

	const start = performance.now();
	let status = 0;
	let ip = "";

	try {
		const dnsPromise = fetch(
			`https://cloudflare-dns.com/dns-query?name=${host}&type=A`,
			{
				headers: { Accept: "application/dns-json" },
			},
		);

		const pingPromise = (async () => {
			try {
				const res = await fetch(`https://${host}`, {
					method: "HEAD",
					headers: { "User-Agent": "Neosphere-Ping/1.0" },
					redirect: "follow",
				});
				return res.status;
			} catch {
				const res = await fetch(`http://${host}`, {
					method: "HEAD",
					headers: { "User-Agent": "Neosphere-Ping/1.0" },
					redirect: "follow",
				});
				return res.status;
			}
		})();

		const [pingStatus, dnsRes] = await Promise.all([pingPromise, dnsPromise]);
		status = pingStatus;

		if (dnsRes.ok) {
			const dnsData = (await dnsRes.json()) as {
				Answer?: { type: number; data: string }[];
			};
			if (dnsData.Answer && dnsData.Answer.length > 0) {
				const record = dnsData.Answer.find((a) => a.type === 1);
				if (record) ip = record.data;
			}
		}
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error", time: 0 },
			502,
		);
	}

	const duration = performance.now() - start;

	return json({ host, time: duration, status, ip: ip || "unknown", ttl: 64 });
}

export async function handleWeather(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const city = url.searchParams.get("city");

	if (!city) {
		return json({ error: "Missing city parameter" }, 400);
	}

	const apiKey = env.OPENWEATHER_API_KEY;

	if (!apiKey) {
		return json(
			{
				name: city,
				sys: { country: "SIM" },
				main: { temp: 22, humidity: 45 },
				weather: [
					{
						description: "scattered clouds (Simulation - No API Key)",
						icon: "03d",
					},
				],
				wind: { speed: 5.2 },
			},
			200,
		);
	}

	try {
		const response = await fetch(
			`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`,
		);

		if (!response.ok) {
			if (response.status === 404) {
				return json({ error: "City not found" }, 404);
			}
			return json(
				{ error: `OpenWeather API Error: ${response.statusText}` },
				response.status,
			);
		}

		const data = await response.json();
		return json(data, 200, { "Cache-Control": "public, max-age=600" });
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function xJson(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(body, null, 2), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"access-control-allow-origin": "*",
			...headers,
		},
	});
}

export async function handleX(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: {
				"access-control-allow-origin": "*",
				"access-control-allow-methods": "GET, OPTIONS",
				"access-control-allow-headers": "content-type",
			},
		});
	}

	if (request.method !== "GET") {
		return xJson({ error: "method_not_allowed" }, 405, {
			allow: "GET, OPTIONS",
		});
	}

	const url = new URL(request.url);

	let raw = (
		url.searchParams.get("username") ||
		url.searchParams.get("handle") ||
		""
	).trim();
	if (!raw) {
		const prefix = "/api/x";
		const suffix = url.pathname.startsWith(prefix)
			? url.pathname.slice(prefix.length).replace(/^\/+/, "")
			: "";
		if (suffix) raw = suffix.split("/")[0].split("?")[0].split("#")[0];
	}

	raw = raw
		.replace(/^@+/, "")
		.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i, "");
	raw = raw.split("/")[0].split("?")[0].split("#")[0];

	if (!raw) {
		return xJson(
			{
				error: "missing_username",
				message: "usage: GET /api/x?username=:handle",
			},
			400,
		);
	}

	if (!HANDLE_RE.test(raw)) {
		return xJson(
			{
				error: "invalid_handle",
				message: "expected 1-15 chars of A-Z, 0-9 or _",
			},
			400,
		);
	}

	const handle = raw;

	if (!env.X_API_URL) {
		return xJson(
			{
				error: "not_configured",
				message: "X_API_URL is not set on the server",
			},
			500,
		);
	}

	const fresh = url.searchParams.get("fresh") === "1" ? "?fresh=1" : "";
	const upstreamUrl = `${env.X_API_URL.replace(/\/+$/, "")}/${encodeURIComponent(handle)}${fresh}`;

	try {
		const upstream = await fetch(upstreamUrl, {
			headers: { accept: "application/json" },
		});

		const bodyText = await upstream.text();
		let data: unknown = null;
		try {
			data = bodyText ? JSON.parse(bodyText) : null;
		} catch {
			return xJson(
				{
					error: "upstream_failed",
					message: `upstream returned ${upstream.status}`,
				},
				502,
			);
		}

		if (upstream.status === 404 || upstream.status === 400) {
			return xJson(data, upstream.status, { "cache-control": "no-store" });
		}
		if (!upstream.ok) {
			return xJson(
				data ?? {
					error: "upstream_failed",
					message: `upstream returned ${upstream.status}`,
				},
				502,
				{ "cache-control": "no-store" },
			);
		}

		return xJson(data, 200, {
			"cache-control": "public, max-age=60, s-maxage=60",
		});
	} catch (e: unknown) {
		return xJson(
			{
				error: "upstream_failed",
				message: e instanceof Error ? e.message : String(e),
			},
			502,
		);
	}
}
