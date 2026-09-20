import type { Env } from "../env";
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
const UPSTREAM_TIMEOUT_MS = 6_000;
const LAST_PLAYED_KEY = "cache:spotify:last_played";
const LAST_PLAYED_TTL_SECONDS = 60 * 60 * 24 * 7;
// Singleflight-ish guard: concurrent stale hits share one revalidation.
// KV has no atomic CAS, so a check-then-act race can still double-fetch;
// N-to-~2 worst case beats N upstream fetches.
const REVALIDATE_LOCK_KEY = "lock:spotify:revalidate";
// KV enforces a 60s minimum expirationTtl — this is the smallest working lock.
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
	if (!env.RATE_LIMITER) return null;
	try {
		const raw = await env.RATE_LIMITER.get(LAST_PLAYED_KEY);
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
	if (!env.RATE_LIMITER) return null;
	try {
		const cachedRaw = await env.RATE_LIMITER.get(CACHE_KEY);
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
		if (!entry.is_playing) return null;
		return {
			entry,
			fresh: Date.now() - cached.cached_at < CACHE_TTL_MS,
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

async function storePlayback(
	env: SpotifyEnv,
	publicData: PublicPlaybackResponse,
): Promise<void> {
	if (!env.RATE_LIMITER) return;
	const now = Date.now();
	const payload = JSON.stringify({ data: publicData, cached_at: now });
	try {
		await env.RATE_LIMITER.put(CACHE_KEY, payload, {
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
		await env.RATE_LIMITER.put(LAST_PLAYED_KEY, payload, {
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
	| { outcome: "error-status"; status: number; payload: unknown | null }
	| { outcome: "exception"; error: string };

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
		return { outcome: "error-status", status: response.status, payload };
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
	if (env.RATE_LIMITER) {
		try {
			const existing = await env.RATE_LIMITER.get(REVALIDATE_LOCK_KEY);
			if (existing) {
				console.info({
					message: "spotify_revalidation_deduped",
					event: "spotify_revalidation_deduped",
				});
				return;
			}
			await env.RATE_LIMITER.put(REVALIDATE_LOCK_KEY, String(Date.now()), {
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
		const result = await fetchUpstream(env);
		if (!result) return;
		if (result.outcome === "ok") {
			await processNotice(env, result.payload);
			try {
				const publicData = toPublicPlaybackResponse(result.payload);
				if (publicData.is_playing) await storePlayback(env, publicData);
			} catch (error) {
				console.error({
					message: "spotify_revalidation_failed",
					event: "spotify_revalidation_failed",
					error: error instanceof Error ? error.message : String(error),
				});
			}
		} else if (
			result.outcome === "error-status" &&
			result.status === 503 &&
			result.payload
		) {
			await processNotice(env, result.payload);
		}
	} catch (error) {
		console.error({
			message: "spotify_revalidation_failed",
			event: "spotify_revalidation_failed",
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		if (env.RATE_LIMITER) {
			await env.RATE_LIMITER.delete(REVALIDATE_LOCK_KEY).catch(() => {});
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
	if (cached?.fresh) {
		return jsonResponse(cached.entry, "HIT", "playing");
	}
	if (cached && !cached.fresh) {
		ctx.waitUntil(revalidatePlayback(env));
		return jsonResponse(cached.entry, "STALE", "playing");
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

		return idleResponseWithHistory(env, "MISS", "idle");
	}

	if (result.outcome === "error-status") {
		if (result.status === 503 && result.payload) {
			ctx.waitUntil(processNotice(env, result.payload));
		}
		return idleResponseWithHistory(env, "MISS", String(result.status));
	}

	return idleResponseWithHistory(env, "MISS", "exception");
}
