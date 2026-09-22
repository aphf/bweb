import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";

interface Attachment {
	cid: string;
	tabId: string;
	lastSeen: number;
}

const EVICT_AFTER_MS = 50_000;
const ALARM_INTERVAL_MS = 30_000;
const MAX_CID_LENGTH = 64;
function sanitizeCid(raw: string | null): string | null {
	if (!raw) return null;
	const trimmed = raw.trim().slice(0, MAX_CID_LENGTH);
	if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
	return trimmed;
}

export class LiveCounter extends DurableObject<Env> {
	private lastSent: number | null = null;

	private socketsOf(): WebSocket[] {
		try {
			return this.ctx.getWebSockets();
		} catch {
			return [];
		}
	}

	private readAttachment(ws: WebSocket): Attachment | null {
		try {
			const raw = ws.deserializeAttachment() as unknown;
			if (typeof raw !== "object" || raw === null) return null;
			const rec = raw as Record<string, unknown>;
			if (
				typeof rec.cid !== "string" ||
				typeof rec.tabId !== "string" ||
				typeof rec.lastSeen !== "number"
			) {
				return null;
			}
			return { cid: rec.cid, tabId: rec.tabId, lastSeen: rec.lastSeen };
		} catch {
			return null;
		}
	}

	private liveCount(): number {
		const seen = new Set<string>();
		for (const ws of this.socketsOf()) {
			const att = this.readAttachment(ws);
			if (att) seen.add(att.cid);
		}
		return seen.size;
	}

	private broadcast(): void {
		const count = this.liveCount();
		if (this.lastSent !== null && count === this.lastSent) return;
		this.lastSent = count;
		const payload = JSON.stringify({ type: "count", live: count });
		for (const ws of this.socketsOf()) {
			try {
				ws.send(payload);
			} catch {}
		}
	}

	private async ensureAlarm(): Promise<void> {
		try {
			await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
		} catch {}
	}

	async getCount(): Promise<number> {
		return this.liveCount();
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.headers.get("Upgrade") !== "websocket") {
			if (request.method !== "GET") {
				return new Response("Method not allowed", { status: 405 });
			}
			return Response.json({ live: this.liveCount() });
		}

		let cid = sanitizeCid(url.searchParams.get("cid"));
		if (!cid) {
			cid = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
		}
		const tabId =
			sanitizeCid(url.searchParams.get("tab")) ?? crypto.randomUUID();

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({
			cid,
			tabId,
			lastSeen: Date.now(),
		} satisfies Attachment);

		await this.ensureAlarm();
		try {
			server.send(JSON.stringify({ type: "count", live: this.liveCount() }));
		} catch {}
		this.broadcast();

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(
		ws: WebSocket,
		message: ArrayBuffer | string,
	): Promise<void> {
		let touch = true;
		if (typeof message === "string") {
			try {
				const parsed: unknown = JSON.parse(message);
				if (
					typeof parsed === "object" &&
					parsed !== null &&
					(parsed as { type?: unknown }).type !== undefined &&
					!["heartbeat", "ping", "hello"].includes(
						String((parsed as { type?: unknown }).type),
					)
				) {
					touch = true;
				}
			} catch {}
		}
		if (touch) {
			const prev = this.readAttachment(ws);
			if (prev) {
				try {
					ws.serializeAttachment({ ...prev, lastSeen: Date.now() });
				} catch {}
			}
		}
		await this.ensureAlarm();
		this.broadcast();
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		_wasClean: boolean,
	): Promise<void> {
		try {
			ws.close(code, reason);
		} catch {}
		await this.ensureAlarm();
		this.broadcast();
	}

	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		console.warn({
			message: "live_counter_socket_error",
			event: "live_counter_socket_error",
			error: error instanceof Error ? error.message : String(error),
		});
		try {
			ws.close(1011, "internal error");
		} catch {}
		await this.ensureAlarm();
		this.broadcast();
	}

	async alarm(): Promise<void> {
		const now = Date.now();
		let changed = false;
		const perCid = new Map<string, { newest: number; sockets: WebSocket[] }>();

		for (const ws of this.socketsOf()) {
			const att = this.readAttachment(ws);
			if (!att) continue;
			const entry = perCid.get(att.cid);
			if (!entry) {
				perCid.set(att.cid, { newest: att.lastSeen, sockets: [ws] });
			} else {
				entry.sockets.push(ws);
				if (att.lastSeen > entry.newest) entry.newest = att.lastSeen;
			}
		}

		for (const [, entry] of perCid) {
			if (now - entry.newest > EVICT_AFTER_MS) {
				for (const ws of entry.sockets) {
					try {
						ws.close(1000, "stale");
					} catch {}
				}
				changed = true;
			}
		}

		if (this.socketsOf().length > 0) {
			await this.ensureAlarm();
		}
		if (changed) this.broadcast();
	}
}
