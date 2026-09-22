import { useCallback, useEffect, useRef, useState } from "react";

export interface VisitorsInfo {
	total: number | null;
}

type VisitorsStatus = "loading" | "ready" | "error";

const INITIAL_STATE: VisitorsInfo = { total: null };
const POLL_INTERVAL_MS = 30_000;

function toNonNegativeInt(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	const n = Math.floor(value);
	return n >= 0 ? n : null;
}

function parseVisitors(value: unknown): VisitorsInfo | null {
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	const totalRaw = record.total;
	const total = totalRaw === null ? null : toNonNegativeInt(totalRaw);
	if (totalRaw !== null && total === null) return null;
	return { total };
}

export function useVisitors() {
	const [info, setInfo] = useState<VisitorsInfo>(INITIAL_STATE);
	const [status, setStatus] = useState<VisitorsStatus>("loading");
	const sequenceRef = useRef(0);
	const controllerRef = useRef<AbortController | null>(null);

	const fetchVisitors = useCallback(async () => {
		const sequence = ++sequenceRef.current;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;

		try {
			const res = await fetch("/api/visitors", {
				headers: { Accept: "application/json" },
				cache: "no-store",
				signal: controller.signal,
			});
			const contentType = res.headers.get("content-type") || "";
			if (!res.ok || !contentType.includes("application/json")) {
				throw new Error(`Unexpected visitors response (${res.status})`);
			}
			const payload: unknown = await res.json();
			const data = parseVisitors(payload);
			if (!data) throw new Error("Invalid visitors response");
			if (sequence !== sequenceRef.current) return;
			setInfo(data);
			setStatus("ready");
		} catch (error) {
			if (controller.signal.aborted) return;
			console.warn("[Visitors] refresh failed:", error);
			if (sequence === sequenceRef.current) setStatus("error");
		} finally {
			if (controllerRef.current === controller) controllerRef.current = null;
		}
	}, []);

	useEffect(() => {
		const refreshWhenActive = () => {
			if (document.visibilityState === "visible") void fetchVisitors();
		};
		const handlePageShow = () => void fetchVisitors();

		void fetchVisitors();
		const interval = window.setInterval(refreshWhenActive, POLL_INTERVAL_MS);

		document.addEventListener("visibilitychange", refreshWhenActive);
		window.addEventListener("pageshow", handlePageShow);
		window.addEventListener("focus", refreshWhenActive);
		window.addEventListener("online", refreshWhenActive);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", refreshWhenActive);
			window.removeEventListener("pageshow", handlePageShow);
			window.removeEventListener("focus", refreshWhenActive);
			window.removeEventListener("online", refreshWhenActive);
			sequenceRef.current += 1;
			controllerRef.current?.abort();
			controllerRef.current = null;
		};
	}, [fetchVisitors]);

	return { ...info, status };
}
