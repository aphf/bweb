import { useCallback, useEffect, useRef, useState } from "react";

export interface ServerStatusInfo {
	isOnline: boolean | null;
	lastPing: Date | null;
	isLoading: boolean;
	relativeTime: string;
	formattedTime: string;
	refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute

function formatRelativeTime(date: Date): string {
	const diffMs = Math.max(0, Date.now() - date.getTime());
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 45) return "just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

function formatLocalTime(date: Date): string {
	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function useServerStatus(): ServerStatusInfo {
	const [isOnline, setIsOnline] = useState<boolean | null>(null);
	const [lastPing, setLastPing] = useState<Date | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [relativeTime, setRelativeTime] = useState<string>("");
	const [formattedTime, setFormattedTime] = useState<string>("");

	const lastFetchTimestampRef = useRef<number>(0);
	const activeControllerRef = useRef<AbortController | null>(null);

	const fetchStatus = useCallback(async () => {
		if (activeControllerRef.current) {
			activeControllerRef.current.abort();
		}

		const controller = new AbortController();
		activeControllerRef.current = controller;

		try {
			const res = await fetch("/api/status", {
				signal: controller.signal,
				headers: { Accept: "application/json" },
			});

			if (!res.ok) {
				throw new Error(`Status API error: ${res.status}`);
			}

			const data = await res.json();
			if (controller.signal.aborted) return;

			if (data?.success && data.server) {
				const server = data.server;
				setIsOnline(Boolean(server.is_online));

				if (server.last_ping) {
					const pingDate = new Date(server.last_ping);
					if (!Number.isNaN(pingDate.getTime())) {
						setLastPing(pingDate);
						setFormattedTime(formatLocalTime(pingDate));
						setRelativeTime(formatRelativeTime(pingDate));
					}
				}
			} else {
				setIsOnline(true);
			}
			lastFetchTimestampRef.current = Date.now();
		} catch (_err: unknown) {
			if (controller.signal.aborted) return;
			setIsOnline(true);
		} finally {
			if (!controller.signal.aborted) {
				setIsLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		fetchStatus();

		const pollTimer = setInterval(() => {
			fetchStatus();
		}, POLL_INTERVAL_MS);

		return () => {
			clearInterval(pollTimer);
			if (activeControllerRef.current) {
				activeControllerRef.current.abort();
			}
		};
	}, [fetchStatus]);

	useEffect(() => {
		if (!lastPing) return;

		const tickTimer = setInterval(() => {
			setRelativeTime(formatRelativeTime(lastPing));
		}, 15_000);

		return () => clearInterval(tickTimer);
	}, [lastPing]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (
				document.visibilityState === "visible" &&
				Date.now() - lastFetchTimestampRef.current > 30_000
			) {
				setIsLoading(true);
				fetchStatus();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [fetchStatus]);

	return {
		isOnline,
		lastPing,
		isLoading,
		relativeTime,
		formattedTime,
		refresh: fetchStatus,
	};
}
