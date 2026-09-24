import { useEffect, useRef, useState } from "react";

type LiveStatus = "loading" | "ready" | "error";

const CID_KEY = "bweb:visitor-id";
const TAB_KEY = "bweb:tab-id";

const HEARTBEAT_MS = 25_000;
const POLL_FALLBACK_MS = 30_000;
const BACKOFFS = [1000, 2000, 5000, 10_000, 30_000];

function randomId(): string {
	try {
		return crypto.randomUUID().replace(/-/g, "");
	} catch {
		return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
	}
}

function getOrCreateCid(): string {
	try {
		const existing = window.localStorage.getItem(CID_KEY);
		if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
		const next = randomId().slice(0, 32);
		window.localStorage.setItem(CID_KEY, next);
		return next;
	} catch {
		return randomId().slice(0, 32);
	}
}

function getTabId(): string {
	try {
		const existing = window.sessionStorage.getItem(TAB_KEY);
		if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
		const next = randomId().slice(0, 32);
		window.sessionStorage.setItem(TAB_KEY, next);
		return next;
	} catch {
		return randomId().slice(0, 32);
	}
}

function toLiveCount(value: unknown): number | null {
	if (typeof value !== "object" || value === null) return null;
	const rec = value as Record<string, unknown>;
	const live = rec.live;
	if (typeof live !== "number" || !Number.isFinite(live) || live < 0) {
		return null;
	}
	return Math.floor(live);
}

function socketAlive(ws: WebSocket | null): boolean {
	return (
		ws !== null &&
		(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
	);
}

export function useLiveCount() {
	const [live, setLive] = useState(0);
	const [status, setStatus] = useState<LiveStatus>("loading");
	const [connected, setConnected] = useState(false);

	const wsRef = useRef<WebSocket | null>(null);
	const heartbeatRef = useRef<number | null>(null);
	const pollRef = useRef<number | null>(null);
	const backoffRef = useRef(0);
	const reconnectRef = useRef<number | null>(null);
	const disposedRef = useRef(false);

	useEffect(() => {
		disposedRef.current = false;
		// OTM: delete the old leader lock. Never read again.
		try {
			window.localStorage.removeItem("bweb:live-leader");
		} catch {}
		const tabId = getTabId();
		const cid = getOrCreateCid();

		const stopHeartbeat = () => {
			if (heartbeatRef.current !== null) {
				window.clearInterval(heartbeatRef.current);
				heartbeatRef.current = null;
			}
		};

		const stopReconnect = () => {
			if (reconnectRef.current !== null) {
				window.clearTimeout(reconnectRef.current);
				reconnectRef.current = null;
			}
		};

		const stopPoll = () => {
			if (pollRef.current !== null) {
				window.clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};

		const closeSocket = () => {
			stopHeartbeat();
			const ws = wsRef.current;
			wsRef.current = null;
			if (ws) {
				try {
					ws.onopen = null;
					ws.onmessage = null;
					ws.onerror = null;
					ws.onclose = null;
					ws.close(1000, "cleanup");
				} catch {}
			}
		};

		const pollCount = async () => {
			if (disposedRef.current || document.visibilityState !== "visible") return;
			if (socketAlive(wsRef.current)) return;
			try {
				const res = await fetch("/api/live/count", {
					headers: { Accept: "application/json" },
					cache: "no-store",
				});
				if (!res.ok) return;
				const count = toLiveCount(await res.json());
				if (count === null || disposedRef.current) return;
				if (socketAlive(wsRef.current)) return;
				setLive(count);
				setStatus("ready");
			} catch {}
		};

		const startPoll = () => {
			if (pollRef.current !== null) return;
			pollRef.current = window.setInterval(() => {
				void pollCount();
			}, POLL_FALLBACK_MS);
		};

		const scheduleReconnect = () => {
			if (disposedRef.current || reconnectRef.current !== null) return;
			const delay = BACKOFFS[Math.min(backoffRef.current, BACKOFFS.length - 1)];
			backoffRef.current += 1;
			reconnectRef.current = window.setTimeout(() => {
				reconnectRef.current = null;
				if (!disposedRef.current) connect();
			}, delay);
		};

		const connect = () => {
			if (disposedRef.current) return;
			closeSocket();
			stopReconnect();

			let ws: WebSocket;
			try {
				const scheme = window.location.protocol === "https:" ? "wss" : "ws";
				ws = new WebSocket(
					`${scheme}://${window.location.host}/api/live?cid=${encodeURIComponent(cid)}&tab=${encodeURIComponent(tabId)}`,
				);
			} catch {
				setStatus((s) => (s === "ready" ? s : "error"));
				setConnected(false);
				void pollCount();
				startPoll();
				scheduleReconnect();
				return;
			}
			wsRef.current = ws;

			ws.onopen = () => {
				if (wsRef.current !== ws || disposedRef.current) return;
				backoffRef.current = 0;
				stopReconnect();
				stopPoll();
				setConnected(true);
				try {
					ws.send(JSON.stringify({ type: "hello", cid, tabId }));
				} catch {}
				stopHeartbeat();
				heartbeatRef.current = window.setInterval(() => {
					try {
						ws.send(JSON.stringify({ type: "heartbeat", cid, tabId }));
					} catch {}
				}, HEARTBEAT_MS);
			};

			ws.onmessage = (event: MessageEvent) => {
				if (wsRef.current !== ws || disposedRef.current) return;
				let parsed: unknown = null;
				try {
					parsed =
						typeof event.data === "string"
							? JSON.parse(event.data)
							: event.data;
				} catch {
					return;
				}
				const count = toLiveCount(parsed);
				if (count === null) return;
				setLive(count);
				setStatus("ready");
				setConnected(true);
			};

			ws.onerror = () => {
				if (wsRef.current !== ws || disposedRef.current) return;
				setStatus((s) => (s === "ready" ? s : "error"));
			};

			ws.onclose = () => {
				if (wsRef.current === ws) wsRef.current = null;
				stopHeartbeat();
				setConnected(false);
				if (disposedRef.current) return;
				void pollCount();
				startPoll();
				scheduleReconnect();
			};
		};

		connect();

		const onVisible = () => {
			if (disposedRef.current || document.visibilityState !== "visible") return;
			if (!socketAlive(wsRef.current)) {
				backoffRef.current = 0;
				connect();
			}
		};
		const onOnline = () => {
			if (disposedRef.current) return;
			if (!socketAlive(wsRef.current)) {
				backoffRef.current = 0;
				connect();
			}
		};

		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("online", onOnline);

		return () => {
			disposedRef.current = true;
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("online", onOnline);
			stopReconnect();
			stopPoll();
			closeSocket();
			setConnected(false);
		};
	}, []);

	return { live, status, connected };
}
