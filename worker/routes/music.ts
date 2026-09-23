import type { Env } from "../env";
import { kvDelete, kvGet, kvPut } from "../lib/d1-kv";
import { json } from "../lib/json";
import {
	getReauthorizationNotice,
	getSpotifyRequest,
	type PublicPlaybackResponse,
	processReauthorizationAlert,
	type SpotifyEnv,
	toPublicPlaybackResponse,
} from "../lib/spotify";

const CACHE_KEY = "cache:spotify:currently_playing";
const CACHE_TTL_MS = 15 * 1000;
const IDLE_FRESH_MS = 60_000;
const IDLE_CACHE_TTL_SECONDS = 120;
const UPSTREAM_TIMEOUT_MS = 6_000;
const LAST_PLAYED_KEY = "cache:spotify:last_played";
const LAST_PLAYED_TTL_SECONDS = 60 * 60 * 24 * 30;
const UPSTREAM_COOLDOWN_KEY = "cache:spotify:upstream_cooldown";
const UPSTREAM_COOLDOWN_TTL_SECONDS = 300;
const DEFAULT_SICK_COOLDOWN_MS = 60_000;
const MAX_RETRY_AFTER_MS = 300_000;
// Singleflight-ish guard: concurrent stale hits share one revalidation.
// No atomic CAS here, so a check-then-act race can still double-fetch;
// N-to-~2 worst case beats N upstream fetches.
const REVALIDATE_LOCK_KEY = "lock:spotify:revalidate";
const REVALIDATE_LOCK_TTL_SECONDS = 60;

type CacheStatus = "HIT" | "STALE" | "MISS" | "BYPASS";
type PlaybackStatus = "playing" | "history" | "idle";

function jsonResponse(
	data: PublicPlaybackResponse,
	cacheStatus: CacheStatus,
	playbackStatus: PlaybackStatus,
	extraHeaders?: Record<string, string>,
): Response {
	const cacheStatusValue =
		cacheStatus === "HIT" || cacheStatus === "STALE"
			? "hit"
			: cacheStatus === "BYPASS"
				? "bypass"
				: "fwd=miss";
	return Response.json(data, {
		headers: {
			"Cache-Control": "no-store, max-age=0",
			"X-Cache-Status": cacheStatus,
			"X-Playback-Status": playbackStatus,
			"Cache-Status": `neosphere; ${cacheStatusValue}`,
			"Cross-Origin-Resource-Policy": "same-origin",
			...extraHeaders,
		},
	});
}

async function getLastPlayed(
	env: SpotifyEnv,
): Promise<PublicPlaybackResponse | null> {
	if (!env.DB) return null;
	try {
		const raw = await kvGet(env.DB, LAST_PLAYED_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("data" in parsed) ||
			!("cached_at" in parsed)
		) {
			return null;
		}
		const record = parsed as { data: unknown; cached_at: unknown };
		if (typeof record.cached_at !== "number") return null;
		if (Date.now() - record.cached_at > LAST_PLAYED_TTL_SECONDS * 1000)
			return null;
		const validated = toPublicPlaybackResponse({
			...(record.data as Record<string, unknown>),
			timestamp: record.cached_at,
		});
		return { ...validated, is_playing: false, timestamp: record.cached_at };
	} catch {
		return null;
	}
}

async function idleResponseWithHistory(
	env: SpotifyEnv,
	cacheStatus: CacheStatus,
	reason?: string,
): Promise<Response> {
	const lastPlayed = await getLastPlayed(env);
	if (lastPlayed) {
		return jsonResponse(lastPlayed, cacheStatus, "history", {
			"X-History-Cache": "HIT",
			...(reason ? { "X-Playback-Reason": reason } : {}),
		});
	}
	return jsonResponse(
		{ is_playing: false, timestamp: Date.now() },
		cacheStatus,
		"idle",
		{
			"X-History-Cache": "MISS",
			...(reason ? { "X-Playback-Reason": reason } : {}),
		},
	);
}

async function readPlaybackCache(
	env: SpotifyEnv,
): Promise<{ entry: PublicPlaybackResponse; fresh: boolean } | null> {
	if (!env.DB) return null;
	try {
		const cachedRaw = await kvGet(env.DB, CACHE_KEY);
		if (!cachedRaw) return null;
		const cached: unknown = JSON.parse(cachedRaw);
		if (
			typeof cached !== "object" ||
			cached === null ||
			!("data" in cached) ||
			!("cached_at" in cached) ||
			typeof cached.cached_at !== "number"
		) {
			return null;
		}
		const entry = toPublicPlaybackResponse(cached.data);
		const windowMs = entry.is_playing ? CACHE_TTL_MS : IDLE_FRESH_MS;
		return {
			entry,
			fresh: Date.now() - cached.cached_at < windowMs,
		};
	} catch (error) {
		console.warn({
			message: "spotify_playback_cache_read_failed",
			event: "spotify_playback_cache_read_failed",
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

async function storeIdle(
	env: SpotifyEnv,
	opts?: { cooldownMs?: number },
): Promise<void> {
	if (!env.DB) return;
	const now = Date.now();
	const data = { is_playing: false, timestamp: now };
	try {
		await kvPut(env.DB, CACHE_KEY, JSON.stringify({ data, cached_at: now }), {
			expirationTtl: IDLE_CACHE_TTL_SECONDS,
		});
	} catch (error) {
		console.error({
			message: "spotify_idle_cache_write_failed",
			event: "spotify_idle_cache_write_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	}
	const cooldownMs = opts?.cooldownMs ?? 0;
	if (cooldownMs > 0) {
		try {
			await kvPut(
				env.DB,
				UPSTREAM_COOLDOWN_KEY,
				JSON.stringify({ not_before: now + cooldownMs }),
				{ expirationTtl: UPSTREAM_COOLDOWN_TTL_SECONDS },
			);
		} catch (error) {
			console.error({
				message: "spotify_cooldown_write_failed",
				event: "spotify_cooldown_write_failed",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

async function upstreamCoolingDown(env: SpotifyEnv): Promise<boolean> {
	if (!env.DB) return false;
	try {
		const raw = await kvGet(env.DB, UPSTREAM_COOLDOWN_KEY);
		if (!raw) return false;
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("not_before" in parsed) ||
			typeof parsed.not_before !== "number"
		) {
			return false;
		}
		return parsed.not_before > Date.now();
	} catch {
		return false;
	}
}

async function storePlayback(
	env: SpotifyEnv,
	publicData: PublicPlaybackResponse,
): Promise<void> {
	if (!env.DB) return;
	const now = Date.now();
	const payload = JSON.stringify({ data: publicData, cached_at: now });
	try {
		await kvPut(env.DB, CACHE_KEY, payload, {
			expirationTtl: 60,
		});
	} catch (error) {
		console.error({
			message: "spotify_playback_cache_write_failed",
			event: "spotify_playback_cache_write_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	}
	try {
		await kvPut(env.DB, LAST_PLAYED_KEY, payload, {
			expirationTtl: LAST_PLAYED_TTL_SECONDS,
		});
	} catch (error) {
		console.error({
			message: "spotify_last_played_write_failed",
			event: "spotify_last_played_write_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

async function processNotice(env: SpotifyEnv, payload: unknown): Promise<void> {
	const notice = getReauthorizationNotice(payload);
	if (!notice) return;
	try {
		await processReauthorizationAlert(env, notice);
	} catch (error) {
		console.error({
			message: "spotify_reauth_processing_failed",
			event: "spotify_reauth_processing_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

type UpstreamResult =
	| { outcome: "ok"; payload: unknown }
	| {
			outcome: "error-status";
			status: number;
			payload: unknown | null;
			retryAfterMs?: number;
	  }
	| { outcome: "exception"; error: string };

function parseRetryAfterMs(value: string | null): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value.trim());
	if (!Number.isFinite(seconds) || seconds < 0) return undefined;
	return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

async function fetchUpstream(env: SpotifyEnv): Promise<UpstreamResult | null> {
	const requestConfig = getSpotifyRequest(env);
	if (!requestConfig) return null;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
	try {
		const response = await fetch(requestConfig.url, {
			method: "GET",
			headers: requestConfig.headers,
			signal: controller.signal,
		});

		if (response.ok) {
			return { outcome: "ok", payload: await response.json() };
		}

		let payload: unknown | null = null;
		try {
			payload = await response.json();
		} catch {
			// Some upstream error responses intentionally have no JSON body.
		}
		console.warn({
			message: "spotify_upstream_non_success",
			event: "spotify_upstream_non_success",
			status: response.status,
		});
		return {
			outcome: "error-status",
			status: response.status,
			payload,
			retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
		};
	} catch (error) {
		console.error({
			message: "spotify_upstream_fetch_failed",
			event: "spotify_upstream_fetch_failed",
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			outcome: "exception",
			error: error instanceof Error ? error.message : String(error),
		};
	} finally {
		clearTimeout(timeoutId);
	}
}

export async function revalidatePlayback(env: Env): Promise<void> {
	if (env.DB) {
		try {
			const existing = await kvGet(env.DB, REVALIDATE_LOCK_KEY);
			if (existing) {
				console.info({
					message: "spotify_revalidation_deduped",
					event: "spotify_revalidation_deduped",
				});
				return;
			}
			await kvPut(env.DB, REVALIDATE_LOCK_KEY, String(Date.now()), {
				expirationTtl: REVALIDATE_LOCK_TTL_SECONDS,
			});
		} catch (error) {
			console.warn({
				message: "spotify_revalidate_lock_failed",
				event: "spotify_revalidate_lock_failed",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	try {
		if (await upstreamCoolingDown(env).catch(() => false)) {
			console.info({
				message: "spotify_revalidation_cooling_down",
				event: "spotify_revalidation_cooling_down",
			});
			return;
		}
		const result = await fetchUpstream(env);
		if (!result) return;
		if (result.outcome === "ok") {
			await processNotice(env, result.payload);
			try {
				const publicData = toPublicPlaybackResponse(result.payload);
				if (publicData.is_playing) {
					await storePlayback(env, publicData);
				} else {
					await storeIdle(env);
				}
			} catch (error) {
				console.error({
					message: "spotify_revalidation_failed",
					event: "spotify_revalidation_failed",
					error: error instanceof Error ? error.message : String(error),
				});
			}
		} else if (result.outcome === "error-status") {
			if (result.status === 503 && result.payload) {
				await processNotice(env, result.payload);
			}
			await storeIdle(env, {
				cooldownMs: result.retryAfterMs ?? DEFAULT_SICK_COOLDOWN_MS,
			});
		} else {
			await storeIdle(env, { cooldownMs: DEFAULT_SICK_COOLDOWN_MS });
		}
	} catch (error) {
		console.error({
			message: "spotify_revalidation_failed",
			event: "spotify_revalidation_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		if (env.DB) {
			await kvDelete(env.DB, REVALIDATE_LOCK_KEY).catch(() => {});
		}
	}
}

export async function handleMusic(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	if (request.method !== "GET") {
		return json({ error: "Method not allowed. Use: GET" }, 405, {
			Allow: "GET",
		});
	}

	const cached = await readPlaybackCache(env);
	if (cached) {
		const cacheStatus = cached.fresh ? "HIT" : "STALE";
		if (!cached.fresh) ctx.waitUntil(revalidatePlayback(env));
		if (cached.entry.is_playing) {
			return jsonResponse(cached.entry, cacheStatus, "playing");
		}
		return idleResponseWithHistory(env, cacheStatus);
	}

	if (await upstreamCoolingDown(env).catch(() => false)) {
		return idleResponseWithHistory(env, "MISS", "cooldown");
	}

	const result = await fetchUpstream(env);
	if (!result) return idleResponseWithHistory(env, "BYPASS", "no_key");

	if (result.outcome === "ok") {
		ctx.waitUntil(processNotice(env, result.payload));
		let publicData: PublicPlaybackResponse;
		try {
			publicData = toPublicPlaybackResponse(result.payload);
		} catch {
			return idleResponseWithHistory(env, "MISS", "invalid");
		}

		if (publicData.is_playing) {
			ctx.waitUntil(storePlayback(env, publicData));
			return jsonResponse(publicData, "MISS", "playing");
		}

		ctx.waitUntil(storeIdle(env));
		return idleResponseWithHistory(env, "MISS", "idle");
	}

	if (result.outcome === "error-status") {
		if (result.status === 503 && result.payload) {
			ctx.waitUntil(processNotice(env, result.payload));
		}
		ctx.waitUntil(
			storeIdle(env, {
				cooldownMs: result.retryAfterMs ?? DEFAULT_SICK_COOLDOWN_MS,
			}),
		);
		return idleResponseWithHistory(env, "MISS", String(result.status));
	}

	ctx.waitUntil(storeIdle(env, { cooldownMs: DEFAULT_SICK_COOLDOWN_MS }));
	return idleResponseWithHistory(env, "MISS", "exception");
}
