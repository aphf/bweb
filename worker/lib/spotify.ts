import * as React from "react";
import { render } from "react-email";
import { type ErrorResponse, Resend } from "resend";
import SpotifyReauthNotificationEmail from "../../emails/SpotifyReauthNotification";

export interface SpotifyEnv {
	RATE_LIMITER?: KVNamespace;
	SPOTIFY_API_URL?: string;
	SPOTIFY_API_KEY?: string;
	RESEND_API_KEY?: string;
	CONTACT_EMAIL_TO?: string;
	CONTACT_EMAIL_FROM?: string;
}

export interface PublicPlaybackResponse {
	is_playing: boolean;
	type?: "track" | "episode";
	title?: string;
	artist?: string;
	album?: string;
	cover_url?: string;
	cover_url_small?: string;
	spotify_url?: string;
	duration_ms?: number;
	progress_ms?: number;
	progress_percent?: number;
	timestamp: number;
}

export interface ReauthorizationNotice {
	status: string;
	reauthorize_by: string;
	days_remaining: number;
	reauthorize_url: string;
	message: string;
}

interface ReauthorizationState {
	status: "pending" | "sent" | "failed";
	milestone: number;
	reauthorize_by: string;
	updated_at: string;
	next_retry_at?: number;
	resend_id?: string;
}

type JsonRecord = Record<string, unknown>;

const REAUTH_STATE_KEY = "state:spotify:reauth_alert_milestone";
const REAUTH_STATE_TTL_SECONDS = 60 * 60 * 24 * 45;
const FAILED_RETRY_DELAY_MS = 15 * 60 * 1000;
const PENDING_RETRY_DELAY_MS = 5 * 60 * 1000;
const RETRY_DELAYS_MS = [500, 1_500] as const;

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function optionalHttpUrl(value: unknown): string | undefined {
	const candidate = optionalString(value);
	if (!candidate) return undefined;
	try {
		const url = new URL(candidate);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

export function toPublicPlaybackResponse(
	value: unknown,
): PublicPlaybackResponse {
	if (!isRecord(value) || typeof value.is_playing !== "boolean") {
		throw new Error("Spotify upstream returned an invalid playback payload");
	}

	const type =
		value.type === "track" || value.type === "episode" ? value.type : undefined;
	const title = optionalString(value.title);
	const artist = optionalString(value.artist);
	const album = optionalString(value.album);
	const coverUrl = optionalHttpUrl(value.cover_url);
	const coverUrlSmall = optionalHttpUrl(value.cover_url_small);
	const spotifyUrl = optionalHttpUrl(value.spotify_url);
	const durationMs = optionalFiniteNumber(value.duration_ms);
	const progressMs = optionalFiniteNumber(value.progress_ms);
	const progressPercent = optionalFiniteNumber(value.progress_percent);

	return {
		is_playing: value.is_playing,
		...(type ? { type } : {}),
		...(title ? { title } : {}),
		...(artist ? { artist } : {}),
		...(album ? { album } : {}),
		...(coverUrl ? { cover_url: coverUrl } : {}),
		...(coverUrlSmall ? { cover_url_small: coverUrlSmall } : {}),
		...(spotifyUrl ? { spotify_url: spotifyUrl } : {}),
		...(durationMs !== undefined
			? { duration_ms: Math.max(0, durationMs) }
			: {}),
		...(progressMs !== undefined
			? { progress_ms: Math.max(0, progressMs) }
			: {}),
		...(progressPercent !== undefined
			? { progress_percent: Math.min(100, Math.max(0, progressPercent)) }
			: {}),
		timestamp: optionalFiniteNumber(value.timestamp) ?? Date.now(),
	};
}

export function getReauthorizationNotice(
	value: unknown,
): ReauthorizationNotice | null {
	if (!isRecord(value) || !isRecord(value.reauthorization)) return null;
	const notice = value.reauthorization;
	const status = optionalString(notice.status);
	const reauthorizeBy = optionalString(notice.reauthorize_by);
	const daysRemaining = optionalFiniteNumber(notice.days_remaining);
	const reauthorizeUrl = optionalHttpUrl(notice.reauthorize_url);
	const message = optionalString(notice.message);
	if (
		!status ||
		!reauthorizeBy ||
		daysRemaining === undefined ||
		!reauthorizeUrl ||
		!message
	) {
		return null;
	}
	return {
		status,
		reauthorize_by: reauthorizeBy,
		days_remaining: daysRemaining,
		reauthorize_url: reauthorizeUrl,
		message,
	};
}

export function getSpotifyRequest(env: SpotifyEnv): {
	url: string;
	headers: Record<string, string>;
} | null {
	const url =
		env.SPOTIFY_API_URL ||
		"https://api.spotify.com/v1/me/player/currently-playing";
	const apiKey = env.SPOTIFY_API_KEY;
	if (!apiKey && !env.SPOTIFY_API_URL) return null;

	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) {
		headers["x-api-key"] = apiKey;
		headers.Authorization = `Bearer ${apiKey}`;
	}
	return { url, headers };
}

function getReauthMilestone(daysRemaining: number): number | null {
	if (daysRemaining <= 1) return 1;
	if (daysRemaining <= 5) return 5;
	if (daysRemaining <= 10) return 10;
	if (daysRemaining <= 20) return 20;
	if (daysRemaining <= 30) return 30;
	return null;
}

function parseState(value: string | null): ReauthorizationState | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			!isRecord(parsed) ||
			(parsed.status !== "pending" &&
				parsed.status !== "sent" &&
				parsed.status !== "failed") ||
			typeof parsed.milestone !== "number" ||
			typeof parsed.reauthorize_by !== "string" ||
			typeof parsed.updated_at !== "string"
		) {
			return null;
		}
		return {
			status: parsed.status,
			milestone: parsed.milestone,
			reauthorize_by: parsed.reauthorize_by,
			updated_at: parsed.updated_at,
			next_retry_at:
				typeof parsed.next_retry_at === "number"
					? parsed.next_retry_at
					: undefined,
			resend_id:
				typeof parsed.resend_id === "string" ? parsed.resend_id : undefined,
		};
	} catch {
		return null;
	}
}

function shouldRetryResend(error: ErrorResponse): boolean {
	return (
		error.statusCode === 429 ||
		(error.statusCode !== null && error.statusCode >= 500) ||
		error.name === "rate_limit_exceeded" ||
		error.name === "internal_server_error" ||
		error.name === "application_error" ||
		error.name === "concurrent_idempotent_requests"
	);
}

function sleep(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function sendReauthorizationEmail(
	env: SpotifyEnv,
	notice: ReauthorizationNotice,
	milestone: number,
): Promise<string | null> {
	const apiKey = env.RESEND_API_KEY;
	const to = env.CONTACT_EMAIL_TO;
	const from = env.CONTACT_EMAIL_FROM;
	if (!apiKey || !to || !from) {
		console.warn(
			JSON.stringify({
				event: "spotify_reauth_email_disabled",
				reason: "missing_email_configuration",
			}),
		);
		return null;
	}

	const recipients = to
		.split(",")
		.map((recipient) => recipient.trim())
		.filter(Boolean);
	if (recipients.length === 0) return null;

	const emailElement = React.createElement(SpotifyReauthNotificationEmail, {
		// Keep the payload stable for this milestone so Resend can safely replay
		// the same idempotency key if the response or subsequent KV write is lost.
		daysRemaining: milestone,
		reauthorizeBy: notice.reauthorize_by,
		reauthorizeUrl: notice.reauthorize_url,
		appName: "Bahauddin Alam",
	});
	const [html, text] = await Promise.all([
		render(emailElement),
		render(emailElement, { plainText: true }),
	]);
	const subject =
		milestone <= 1
			? "Spotify authorization expires today"
			: milestone <= 5
				? "Spotify authorization expiring soon"
				: "Spotify reauthorization reminder";
	const idempotencyKey =
		`spotify-reauth/${milestone}/${notice.reauthorize_by}`.slice(0, 256);
	const resend = new Resend(apiKey);

	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
		const { data, error } = await resend.emails.send(
			{
				from,
				to: [recipients[0]],
				bcc: recipients.length > 1 ? recipients.slice(1) : undefined,
				subject,
				html,
				text,
			},
			{ idempotencyKey },
		);
		if (!error) return data.id;

		const canRetry = shouldRetryResend(error);
		console.error(
			JSON.stringify({
				event: "spotify_reauth_email_attempt_failed",
				attempt: attempt + 1,
				code: error.name,
				status: error.statusCode,
				retrying: canRetry && attempt < RETRY_DELAYS_MS.length,
			}),
		);
		if (!canRetry || attempt >= RETRY_DELAYS_MS.length) {
			throw new Error(
				`Resend rejected Spotify reauthorization email: ${error.name}`,
			);
		}
		await sleep(RETRY_DELAYS_MS[attempt]);
	}
	throw new Error("Spotify reauthorization email exhausted all retries");
}

async function persistState(
	kv: KVNamespace,
	state: ReauthorizationState,
): Promise<void> {
	await kv.put(REAUTH_STATE_KEY, JSON.stringify(state), {
		expirationTtl: REAUTH_STATE_TTL_SECONDS,
	});
}

export async function processReauthorizationAlert(
	env: SpotifyEnv,
	notice: ReauthorizationNotice,
): Promise<void> {
	const milestone = getReauthMilestone(notice.days_remaining);
	if (milestone === null) return;
	const kv = env.RATE_LIMITER;
	if (!kv) {
		console.warn(
			JSON.stringify({
				event: "spotify_reauth_notification_disabled",
				reason: "missing_kv_binding",
			}),
		);
		return;
	}

	const now = Date.now();
	const state = parseState(await kv.get(REAUTH_STATE_KEY));
	const sameCycle = state?.reauthorize_by === notice.reauthorize_by;
	if (sameCycle && state?.status === "sent" && state.milestone <= milestone) {
		return;
	}
	if (
		sameCycle &&
		state?.milestone === milestone &&
		state.status !== "sent" &&
		(state.next_retry_at ?? 0) > now
	) {
		return;
	}

	try {
		await persistState(kv, {
			status: "pending",
			milestone,
			reauthorize_by: notice.reauthorize_by,
			updated_at: new Date(now).toISOString(),
			next_retry_at: now + PENDING_RETRY_DELAY_MS,
		});
	} catch (error) {
		console.error(
			JSON.stringify({
				event: "spotify_reauth_state_pending_write_failed",
				error: error instanceof Error ? error.message : String(error),
			}),
		);
	}

	try {
		const resendId = await sendReauthorizationEmail(env, notice, milestone);
		if (!resendId) return;
		await persistState(kv, {
			status: "sent",
			milestone,
			reauthorize_by: notice.reauthorize_by,
			updated_at: new Date().toISOString(),
			resend_id: resendId,
		});
		console.log(
			JSON.stringify({
				event: "spotify_reauth_email_sent",
				milestone,
				resend_id: resendId,
			}),
		);
	} catch (error) {
		try {
			await persistState(kv, {
				status: "failed",
				milestone,
				reauthorize_by: notice.reauthorize_by,
				updated_at: new Date().toISOString(),
				next_retry_at: Date.now() + FAILED_RETRY_DELAY_MS,
			});
		} catch (stateError) {
			console.error(
				JSON.stringify({
					event: "spotify_reauth_state_failure_write_failed",
					error:
						stateError instanceof Error
							? stateError.message
							: String(stateError),
				}),
			);
		}
		throw error;
	}
}
