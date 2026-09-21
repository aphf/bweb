import type { Env } from "../env";
import { json } from "../lib/json";

const DEFAULT_UMAMI_BASE = "https://umami.ranjan.cloud";
const DEFAULT_WEBSITE_ID = "49f2e243-7680-41a5-9b4b-cfc703024002";
const CACHE_KEY = "cache:visitors:v1";
const FRESH_MS = 30_000;
const UPSTREAM_TIMEOUT_MS = 6_000;
const REVALIDATE_LOCK_KEY = "lock:visitors:revalidate";
const REVALIDATE_LOCK_TTL_SECONDS = 60;

interface VisitorsData {
	total: number | null;
	live: number;
}

function toNonNegativeInt(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	const n = Math.floor(value);
	return n >= 0 ? n : null;
}

function umamiConfig(env: Env): {
	base: string;
	websiteId: string;
	token: string;
} | null {
	const base = (env.UMAMI_BASE_URL || DEFAULT_UMAMI_BASE).replace(/\/+$/, "");
	const websiteId = env.UMAMI_WEBSITE_ID || DEFAULT_WEBSITE_ID;
	const token = env.UMAMI_API_TOKEN || env.UMAMI_TOKEN;
	if (!token) return null;
	return { base, websiteId, token };
}

async function readCache(env: Env): Promise<{
	data: VisitorsData;
	cachedAt: number;
} | null> {
	if (!env.RATE_LIMITER) return null;
	try {
		const raw = await env.RATE_LIMITER.get(CACHE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;
		const record = parsed as { data?: unknown; cached_at?: unknown };
		if (typeof record.cached_at !== "number") return null;
		if (typeof record.data !== "object" || record.data === null) return null;
		const data = record.data as { total?: unknown; live?: unknown };
		const total = data.total === null ? null : toNonNegativeInt(data.total);
		if (data.total !== null && total === null) return null;
		const live = toNonNegativeInt(data.live) ?? 0;
		return { data: { total, live }, cachedAt: record.cached_at };
	} catch {
		return null;
	}
}

async function writeCache(env: Env, data: VisitorsData): Promise<void> {
	if (!env.RATE_LIMITER) return;
	try {
		await env.RATE_LIMITER.put(
			CACHE_KEY,
			JSON.stringify({ data, cached_at: Date.now() }),
			{ expirationTtl: 120 },
		);
	} catch {}
}

async function fetchUpstream(
	base: string,
	websiteId: string,
	token: string,
): Promise<VisitorsData | null> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
	try {
		const headers = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};
		const endAt = Date.now();
		const [statsRes, activeRes] = await Promise.all([
			fetch(
				`${base}/api/websites/${encodeURIComponent(websiteId)}/stats?startAt=0&endAt=${endAt}`,
				{ headers, signal: controller.signal },
			),
			fetch(`${base}/api/websites/${encodeURIComponent(websiteId)}/active`, {
				headers,
				signal: controller.signal,
			}),
		]);
		if (!statsRes.ok || !activeRes.ok) return null;
		const [stats, active] = (await Promise.all([
			statsRes.json(),
			activeRes.json(),
		])) as Array<Record<string, unknown>>;
		const total = toNonNegativeInt(stats?.visitors);
		if (total === null) return null;
		const live = toNonNegativeInt(active?.visitors) ?? 0;
		return { total, live };
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

function response(
	data: VisitorsData,
	cacheStatus: "HIT" | "STALE" | "MISS" | "BYPASS",
	status = 200,
): Response {
	return json(data, status, {
		"Cache-Control": "no-store",
		"X-Cache-Status": cacheStatus,
		"Cross-Origin-Resource-Policy": "same-origin",
	});
}

export async function revalidateVisitors(env: Env): Promise<void> {
	const config = umamiConfig(env);
	if (!config) return;

	if (env.RATE_LIMITER) {
		try {
			const existing = await env.RATE_LIMITER.get(REVALIDATE_LOCK_KEY);
			if (existing) {
				console.info({
					message: "visitors_revalidation_deduped",
					event: "visitors_revalidation_deduped",
				});
				return;
			}
			await env.RATE_LIMITER.put(REVALIDATE_LOCK_KEY, String(Date.now()), {
				expirationTtl: REVALIDATE_LOCK_TTL_SECONDS,
			});
		} catch (error) {
			console.warn({
				message: "visitors_revalidate_lock_failed",
				event: "visitors_revalidate_lock_failed",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	try {
		const fresh = await fetchUpstream(
			config.base,
			config.websiteId,
			config.token,
		);
		if (fresh) {
			await writeCache(env, fresh);
		} else {
			console.warn({
				message: "visitors_revalidation_upstream_failed",
				event: "visitors_revalidation_upstream_failed",
			});
		}
	} catch (error) {
		console.error({
			message: "visitors_revalidation_failed",
			event: "visitors_revalidation_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		if (env.RATE_LIMITER) {
			await env.RATE_LIMITER.delete(REVALIDATE_LOCK_KEY).catch(() => {});
		}
	}
}

export async function handleVisitors(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}

	const cached = await readCache(env);
	if (cached && Date.now() - cached.cachedAt < FRESH_MS) {
		return response(cached.data, "HIT");
	}
	if (cached) {
		ctx.waitUntil(revalidateVisitors(env));
		return response(cached.data, "STALE");
	}

	const config = umamiConfig(env);
	if (!config) {
		return response({ total: null, live: 0 }, "BYPASS");
	}

	const fresh = await fetchUpstream(
		config.base,
		config.websiteId,
		config.token,
	);
	if (fresh) {
		await writeCache(env, fresh);
		return response(fresh, "MISS");
	}

	return response({ total: null, live: 0 }, "MISS", 502);
}
