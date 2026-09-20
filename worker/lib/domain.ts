import * as React from "react";
import { render } from "react-email";
import { type ErrorResponse, Resend } from "resend";
import DomainExpiryNotificationEmail from "../../emails/DomainExpiryNotification";

export interface DomainEnv {
	RATE_LIMITER?: KVNamespace;
	RESEND_API_KEY?: string;
	CONTACT_EMAIL_TO?: string;
	CONTACT_EMAIL_FROM?: string;
	MONITORED_DOMAINS?: string;
	DOMAIN_RENEW_URL?: string;
}

export interface DomainExpiryInfo {
	domain: string;
	expiresAt: string;
	daysRemaining: number;
	registrar?: string;
}

type JsonRecord = Record<string, unknown>;

const RDAP_TIMEOUT_MS = 6_000;
const RETRY_DELAYS_MS = [500, 1_500] as const;
const MS_PER_DAY = 86_400_000;

// Range-matched bands: a missed day falls into the next band down instead of
// missing its alert entirely. KV state (per domain + expiry cycle) ensures
// each band still sends exactly once.
export function getDomainMilestone(daysRemaining: number): number | null {
	if (daysRemaining <= 1) return 1;
	if (daysRemaining <= 2) return 2;
	if (daysRemaining <= 5) return 5;
	if (daysRemaining <= 10) return 10;
	if (daysRemaining <= 20) return 20;
	if (daysRemaining <= 30) return 30;
	return null;
}

export function parseMonitoredDomains(value: unknown): string[] {
	if (typeof value !== "string") return [];
	return value
		.split(",")
		.map((entry) => entry.trim().toLowerCase().replace(/\.$/, ""))
		.filter((entry) => entry.length > 0 && entry.includes("."));
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findExpirationEvent(payload: unknown): string | null {
	if (!isRecord(payload)) return null;
	const events = payload.events;
	if (!Array.isArray(events)) return null;
	for (const event of events) {
		if (!isRecord(event)) continue;
		if (
			event.eventAction === "expiration" &&
			typeof event.eventDate === "string" &&
			event.eventDate.trim()
		) {
			return event.eventDate.trim();
		}
	}
	return null;
}

function findRegistrar(payload: unknown): string | undefined {
	if (!isRecord(payload)) return undefined;
	// rdap.org aggregates; entities with registrar role usually carry a vcard name.
	const entities = payload.entities;
	if (!Array.isArray(entities)) return undefined;
	for (const entity of entities) {
		if (!isRecord(entity)) continue;
		const roles = entity.roles;
		if (!Array.isArray(roles) || !roles.includes("registrar")) continue;
		const vcard = entity.vcardArray;
		if (Array.isArray(vcard) && Array.isArray(vcard[1])) {
			for (const field of vcard[1] as unknown[]) {
				if (
					Array.isArray(field) &&
					field[0] === "fn" &&
					typeof field[3] === "string" &&
					field[3].trim()
				) {
					return field[3].trim();
				}
			}
		}
		if (typeof entity.handle === "string" && entity.handle.trim()) {
			return entity.handle.trim();
		}
	}
	return undefined;
}

export async function fetchDomainExpiry(
	domain: string,
): Promise<DomainExpiryInfo | null> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);
	try {
		const response = await fetch(
			`https://rdap.org/domain/${encodeURIComponent(domain)}`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "neosphere-domain-expiry-cron/1.0",
				},
				signal: controller.signal,
			},
		);
		if (!response.ok) {
			console.warn({
				message: "domain_rdap_non_success",
				event: "domain_rdap_non_success",
				domain,
				status: response.status,
			});
			return null;
		}
		const payload: unknown = await response.json();
		const expiresAt = findExpirationEvent(payload);
		if (!expiresAt) {
			console.warn({
				message: "domain_rdap_no_expiration",
				event: "domain_rdap_no_expiration",
				domain,
			});
			return null;
		}
		const expiresMs = new Date(expiresAt).getTime();
		if (!Number.isFinite(expiresMs)) return null;
		const daysRemaining = Math.ceil((expiresMs - Date.now()) / MS_PER_DAY);
		return {
			domain,
			expiresAt: new Date(expiresMs).toISOString(),
			daysRemaining,
			registrar: findRegistrar(payload),
		};
	} catch (error) {
		console.error({
			message: "domain_rdap_fetch_failed",
			event: "domain_rdap_fetch_failed",
			domain,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	} finally {
		clearTimeout(timeoutId);
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

function getSubject(domain: string, milestone: number): string {
	if (milestone <= 1) return `URGENT: ${domain} expires tomorrow`;
	if (milestone <= 2) return `${domain} expires in 2 days`;
	if (milestone <= 5) return `${domain} expires in 5 days`;
	if (milestone <= 10) return `${domain} expires in 10 days — renewal reminder`;
	return `${domain} expires in ${milestone} days — renewal reminder`;
}

async function sendDomainExpiryEmail(
	env: DomainEnv,
	info: DomainExpiryInfo,
	milestone: number,
): Promise<string | null> {
	const apiKey = env.RESEND_API_KEY;
	const to = env.CONTACT_EMAIL_TO;
	const from = env.CONTACT_EMAIL_FROM;
	if (!apiKey || !to || !from) {
		console.warn({
			message: "domain_expiry_email_disabled",
			event: "domain_expiry_email_disabled",
			reason: "missing_email_configuration",
		});
		return null;
	}

	const recipients = to
		.split(",")
		.map((recipient) => recipient.trim())
		.filter(Boolean);
	if (recipients.length === 0) return null;

	const trimmedRenewUrl = env.DOMAIN_RENEW_URL?.trim();
	const emailElement = React.createElement(DomainExpiryNotificationEmail, {
		domain: info.domain,
		expiresAt: info.expiresAt,
		// Stable per milestone so Resend can replay the same idempotency key.
		daysRemaining: milestone,
		...(trimmedRenewUrl ? { renewUrl: trimmedRenewUrl } : {}),
		registrar: info.registrar,
		appName: "Bahauddin Alam",
	});
	const [html, text] = await Promise.all([
		render(emailElement),
		render(emailElement, { plainText: true }),
	]);
	const idempotencyKey =
		`domain-expiry/${info.domain}/${milestone}/${info.expiresAt}`.slice(0, 256);
	const resend = new Resend(apiKey);

	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
		const { data, error } = await resend.emails.send(
			{
				from,
				to: [recipients[0]],
				bcc: recipients.length > 1 ? recipients.slice(1) : undefined,
				subject: getSubject(info.domain, milestone),
				html,
				text,
			},
			{ idempotencyKey },
		);
		if (!error) return data.id;

		const canRetry = shouldRetryResend(error);
		console.error({
			message: "domain_expiry_email_attempt_failed",
			event: "domain_expiry_email_attempt_failed",
			domain: info.domain,
			milestone,
			attempt: attempt + 1,
			code: error.name,
			status: error.statusCode,
			retrying: canRetry && attempt < RETRY_DELAYS_MS.length,
		});
		if (!canRetry || attempt >= RETRY_DELAYS_MS.length) {
			throw new Error(`Resend rejected domain expiry email: ${error.name}`);
		}
		await sleep(RETRY_DELAYS_MS[attempt]);
	}
	throw new Error("Domain expiry email exhausted all retries");
}

interface DomainAlertState {
	status: "pending" | "sent" | "failed";
	milestone: number;
	expires_at: string;
	updated_at: string;
	next_retry_at?: number;
	resend_id?: string;
}

const STATE_TTL_SECONDS = 60 * 60 * 24 * 45;
const FAILED_RETRY_DELAY_MS = 15 * 60 * 1000;
const PENDING_RETRY_DELAY_MS = 5 * 60 * 1000;

function stateKey(domain: string): string {
	return `state:domain:expiry:${domain.toLowerCase()}`;
}

function parseState(value: string | null): DomainAlertState | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			!isRecord(parsed) ||
			(parsed.status !== "pending" &&
				parsed.status !== "sent" &&
				parsed.status !== "failed") ||
			typeof parsed.milestone !== "number" ||
			typeof parsed.expires_at !== "string" ||
			typeof parsed.updated_at !== "string"
		) {
			return null;
		}
		return {
			status: parsed.status,
			milestone: parsed.milestone,
			expires_at: parsed.expires_at,
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

async function persistState(
	kv: KVNamespace,
	domain: string,
	state: DomainAlertState,
): Promise<void> {
	await kv.put(stateKey(domain), JSON.stringify(state), {
		expirationTtl: STATE_TTL_SECONDS,
	});
}

export async function processDomainExpiry(
	env: DomainEnv,
	info: DomainExpiryInfo,
): Promise<void> {
	const milestone = getDomainMilestone(info.daysRemaining);
	if (milestone === null) return;
	const kv = env.RATE_LIMITER;
	if (!kv) {
		console.warn({
			message: "domain_expiry_notification_disabled",
			event: "domain_expiry_notification_disabled",
			reason: "missing_kv_binding",
		});
		return;
	}

	const now = Date.now();
	const state = parseState(await kv.get(stateKey(info.domain)));
	// A changed expiry date means the domain was renewed: new cycle, alert again.
	const sameCycle = state?.expires_at === info.expiresAt;
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
		await persistState(kv, info.domain, {
			status: "pending",
			milestone,
			expires_at: info.expiresAt,
			updated_at: new Date(now).toISOString(),
			next_retry_at: now + PENDING_RETRY_DELAY_MS,
		});
	} catch (error) {
		console.error({
			message: "domain_expiry_state_pending_write_failed",
			event: "domain_expiry_state_pending_write_failed",
			domain: info.domain,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	try {
		const resendId = await sendDomainExpiryEmail(env, info, milestone);
		if (!resendId) return;
		await persistState(kv, info.domain, {
			status: "sent",
			milestone,
			expires_at: info.expiresAt,
			updated_at: new Date().toISOString(),
			resend_id: resendId,
		});
		console.log({
			message: "domain_expiry_email_sent",
			event: "domain_expiry_email_sent",
			domain: info.domain,
			milestone,
			resend_id: resendId,
		});
	} catch (error) {
		try {
			await persistState(kv, info.domain, {
				status: "failed",
				milestone,
				expires_at: info.expiresAt,
				updated_at: new Date().toISOString(),
				next_retry_at: Date.now() + FAILED_RETRY_DELAY_MS,
			});
		} catch (stateError) {
			console.error({
				message: "domain_expiry_state_failure_write_failed",
				event: "domain_expiry_state_failure_write_failed",
				domain: info.domain,
				error:
					stateError instanceof Error ? stateError.message : String(stateError),
			});
		}
		throw error;
	}
}

export async function checkDomainExpiries(env: DomainEnv): Promise<void> {
	const domains = parseMonitoredDomains(env.MONITORED_DOMAINS);
	if (domains.length === 0) return;

	for (const domain of domains) {
		try {
			const info = await fetchDomainExpiry(domain);
			if (!info) continue;
			await processDomainExpiry(env, info);
		} catch (error) {
			console.error({
				message: "domain_expiry_processing_failed",
				event: "domain_expiry_processing_failed",
				domain,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
