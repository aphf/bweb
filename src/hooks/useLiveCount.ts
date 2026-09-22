import { useEffect, useRef, useState } from "react";

type LiveStatus = "loading" | "ready" | "error";

const CID_KEY = "bweb:visitor-id";
const TAB_KEY = "bweb:tab-id";
const LEADER_KEY = "bweb:live-leader";
const BC_NAME = "bweb:live";

const HEARTBEAT_MS = 25_000;
const LEADER_HEARTBEAT_MS = 5_000;
const LEADER_STALE_MS = 10_000;
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

interface LeaderRecord {
	tabId: string;
	ts: number;
}

function readLeader(): LeaderRecord | null {
	try {
		const raw = window.localStorage.getItem(LEADER_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<LeaderRecord>;
		if (typeof parsed.tabId !== "string" || typeof parsed.ts !== "number") {
			return null;
		}
		return { tabId: parsed.tabId, ts: parsed.ts };
	} catch {
		return null;
	}
}

function toPresence(
	value: unknown,
): { live: number; connected: boolean } | null {
	if (typeof value !== "object" || value === null) return null;
	const rec = value as Record<string, unknown>;
	const live = rec.live;
	if (typeof live !== "number" || !Number.isFinite(live) || live < 0) {
		return null;
	}
	const connected = rec.connected;
	return {
		live: Math.floor(live),
		connected: connected === true,
	};
}

export function useLiveCount() {
	const [live, setLive] = useState(0);
	const [status, setStatus] = useState<LiveStatus>("loading");
	const [connected, setConnected] = useState(false);

	const tabIdRef = useRef<string>("");
	const cidRef = useRef<string>("");
	const isLeaderRef = useRef(false);
	const wsRef = useRef<WebSocket | null>(null);
	const bcRef = useRef<BroadcastChannel | null>(null);
	const heartbeatRef = useRef<number | null>(null);
	const leaderBeatRef = useRef<number | null>(null);
	const pollRef = useRef<number | null>(null);
	const backoffRef = useRef(0);
	const reconnectRef = useRef<number | null>(null);
	const disposedRef = useRef(false);

	useEffect(() => {
		disposedRef.current = false;
		const tabId = getTabId();
		const cid = getOrCreateCid();
		tabIdRef.current = tabId;
		cidRef.current = cid;

		const hasBC = typeof BroadcastChannel !== "undefined";
		let bc: BroadcastChannel | null = null;
		if (hasBC) {
			try {
				bc = new BroadcastChannel(BC_NAME);
				bcRef.current = bc;
				bc.onmessage = (event: MessageEvent) => {
					const next = toPresence(event.data);
					if (next !== null) {
						setLive(next.live);
						setConnected(next.connected);
						setStatus("ready");
					}
				};
			} catch {
				bcRef.current = null;
			}
		}

		const broadcastCount = (value: number, viaSocket: boolean) => {
			setLive(value);
			setConnected(viaSocket);
			setStatus("ready");
			try {
				bcRef.current?.postMessage({ live: value, connected: viaSocket });
			} catch {}
		};

		const stopHeartbeat = () => {
			if (heartbeatRef.current !== null) {
				window.clearInterval(heartbeatRef.current);
				heartbeatRef.current = null;
			}
		};

		const stopPoll = () => {
			if (pollRef.current !== null) {
				window.clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};

		const stopReconnect = () => {
			if (reconnectRef.current !== null) {
				window.clearTimeout(reconnectRef.current);
				reconnectRef.current = null;
			}
		};

		const closeSocket = () => {
			stopHeartbeat();
			stopReconnect();
			setConnected(false);
			const ws = wsRef.current;
			wsRef.current = null;
			if (ws) {
				try {
					ws.onopen = null;
					ws.onmessage = null;
					ws.onerror = null;
					ws.onclose = null;
					ws.close(1000, "leader-stepdown");
				} catch {}
			}
		};

		const pollCount = async () => {
			try {
				const res = await fetch("/api/live/count", {
					headers: { Accept: "application/json" },
					cache: "no-store",
				});
				if (!res.ok) return;
				const payload: unknown = await res.json();
				const next = toPresence(payload);
				if (next === null) return;
				setLive(next.live);
				setStatus("ready");
				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
					setConnected(false);
					try {
						bcRef.current?.postMessage({ live: next.live, connected: false });
					} catch {}
				}
			} catch {}
		};

		const startPollFallback = () => {
			if (pollRef.current !== null) return;
			void pollCount();
			pollRef.current = window.setInterval(() => {
				void pollCount();
			}, POLL_FALLBACK_MS);
		};

		const scheduleReconnect = () => {
			if (disposedRef.current || !isLeaderRef.current) return;
			if (reconnectRef.current !== null) return;
			const delay = BACKOFFS[Math.min(backoffRef.current, BACKOFFS.length - 1)];
			backoffRef.current += 1;
			reconnectRef.current = window.setTimeout(() => {
				reconnectRef.current = null;
				if (disposedRef.current || !isLeaderRef.current) return;
				connect();
			}, delay);
		};

		const connect = () => {
			if (disposedRef.current || !isLeaderRef.current) return;
			closeSocket();
			stopPoll();

			let ws: WebSocket;
			try {
				const scheme = window.location.protocol === "https:" ? "wss" : "ws";
				ws = new WebSocket(
					`${scheme}://${window.location.host}/api/live?cid=${encodeURIComponent(cid)}&tab=${encodeURIComponent(tabId)}`,
				);
			} catch {
				setStatus("error");
				startPollFallback();
				return;
			}
			wsRef.current = ws;

			ws.onopen = () => {
				if (wsRef.current !== ws) return;
				backoffRef.current = 0;
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
				let parsed: unknown = null;
				try {
					parsed =
						typeof event.data === "string"
							? JSON.parse(event.data)
							: event.data;
				} catch {
					return;
				}
				const next = toPresence(parsed);
				if (next !== null) broadcastCount(next.live, true);
			};

			ws.onerror = () => {
				if (!isLeaderRef.current) return;
				setStatus((s) => (s === "ready" ? s : "error"));
			};

			ws.onclose = () => {
				if (wsRef.current === ws) wsRef.current = null;
				stopHeartbeat();
				setConnected(false);
				if (disposedRef.current || !isLeaderRef.current) return;
				scheduleReconnect();
				startPollFallback();
			};
		};

		const claim = () => {
			try {
				window.localStorage.setItem(
					LEADER_KEY,
					JSON.stringify({ tabId, ts: Date.now() } satisfies LeaderRecord),
				);
			} catch {
				isLeaderRef.current = true;
				connect();
				return;
			}
			if (!isLeaderRef.current) {
				isLeaderRef.current = true;
				connect();
			}
		};

		const evaluate = () => {
			if (disposedRef.current) return;
			if (!hasBC) {
				if (!isLeaderRef.current) {
					isLeaderRef.current = true;
					connect();
				}
				return;
			}
			const leader = readLeader();
			const now = Date.now();
			if (
				!leader ||
				now - leader.ts > LEADER_STALE_MS ||
				leader.tabId === tabId
			) {
				if (
					!leader ||
					leader.tabId !== tabId ||
					now - leader.ts > LEADER_STALE_MS
				) {
					if (leader?.tabId === tabId) {
						try {
							window.localStorage.setItem(
								LEADER_KEY,
								JSON.stringify({ tabId, ts: now } satisfies LeaderRecord),
							);
						} catch {}
						return;
					}
					claim();
					return;
				}
			}
			if (isLeaderRef.current && leader.tabId !== tabId) {
				isLeaderRef.current = false;
				closeSocket();
				stopPoll();
			}
		};

		const beatLeader = () => {
			if (!isLeaderRef.current || disposedRef.current) return;
			try {
				window.localStorage.setItem(
					LEADER_KEY,
					JSON.stringify({ tabId, ts: Date.now() } satisfies LeaderRecord),
				);
			} catch {}
		};

		const onStorage = (event: StorageEvent) => {
			if (event.key === LEADER_KEY) evaluate();
		};

		const release = () => {
			try {
				const leader = readLeader();
				if (leader?.tabId === tabId) {
					window.localStorage.removeItem(LEADER_KEY);
				}
			} catch {}
		};

		evaluate();
		const evalTimer = window.setInterval(evaluate, 2000);
		leaderBeatRef.current = window.setInterval(beatLeader, LEADER_HEARTBEAT_MS);
		window.addEventListener("storage", onStorage);
		const onPageHide = () => {
			if (isLeaderRef.current) {
				closeSocket();
				release();
				isLeaderRef.current = false;
			}
		};
		const onPageShow = () => evaluate();
		window.addEventListener("pagehide", onPageHide);
		window.addEventListener("pageshow", onPageShow);

		return () => {
			disposedRef.current = true;
			window.clearInterval(evalTimer);
			if (leaderBeatRef.current !== null) {
				window.clearInterval(leaderBeatRef.current);
				leaderBeatRef.current = null;
			}
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("pagehide", onPageHide);
			window.removeEventListener("pageshow", onPageShow);
			if (isLeaderRef.current) release();
			isLeaderRef.current = false;
			closeSocket();
			stopPoll();
			try {
				bc?.close();
			} catch {}
			bcRef.current = null;
		};
	}, []);

	return { live, status, connected };
}
