import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ExtractedColors,
	extractDominantColor,
} from "../utils/colorExtractor";

export interface SpotifyTrack {
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

type PlayerStatus = "loading" | "ready" | "error";

const INITIAL_STATE: SpotifyTrack = {
	is_playing: false,
	timestamp: 0,
};

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function parseSpotifyTrack(value: unknown): SpotifyTrack | null {
	if (
		typeof value !== "object" ||
		value === null ||
		!("is_playing" in value) ||
		typeof value.is_playing !== "boolean"
	) {
		return null;
	}
	const record = value as Record<string, unknown>;

	const type =
		record.type === "track" || record.type === "episode"
			? record.type
			: undefined;
	const title = optionalString(record.title);
	const artist = optionalString(record.artist);
	const album = optionalString(record.album);
	const coverUrl = optionalString(record.cover_url);
	const coverUrlSmall = optionalString(record.cover_url_small);
	const spotifyUrl = optionalString(record.spotify_url);
	const durationMs = optionalNumber(record.duration_ms);
	const progressMs = optionalNumber(record.progress_ms);
	const progressPercent = optionalNumber(record.progress_percent);

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
		timestamp: optionalNumber(record.timestamp) ?? Date.now(),
	};
}

function projectPlaybackProgress(track: SpotifyTrack, now: number): number {
	const baseProgress = track.progress_ms || 0;
	const duration = track.duration_ms || 0;
	if (!track.is_playing || duration <= 0) return baseProgress;

	const elapsedSinceSnapshot = Math.max(0, now - track.timestamp);
	return Math.min(duration, baseProgress + elapsedSinceSnapshot);
}

export function useSpotifyPlayer() {
	const [track, setTrack] = useState<SpotifyTrack>(INITIAL_STATE);
	const [colors, setColors] = useState<ExtractedColors | null>(null);
	const [liveProgressMs, setLiveProgressMs] = useState(0);
	const [status, setStatus] = useState<PlayerStatus>("loading");

	const trackRef = useRef<SpotifyTrack>(INITIAL_STATE);
	const activeControllerRef = useRef<AbortController | null>(null);
	const requestSequenceRef = useRef(0);
	const colorSequenceRef = useRef(0);
	const colorCoverUrlRef = useRef<string | null>(null);
	const lastFetchStartedAtRef = useRef(0);
	trackRef.current = track;

	const fetchCurrentlyPlaying = useCallback(async () => {
		const now = Date.now();
		if (now - lastFetchStartedAtRef.current < 750) return;
		lastFetchStartedAtRef.current = now;

		const requestSequence = ++requestSequenceRef.current;
		activeControllerRef.current?.abort();
		const controller = new AbortController();
		activeControllerRef.current = controller;

		try {
			const res = await fetch("/api/music", {
				headers: { Accept: "application/json" },
				cache: "no-store",
				signal: controller.signal,
			});

			const contentType = res.headers.get("content-type") || "";
			if (!res.ok || !contentType.includes("application/json")) {
				throw new Error(
					`Unexpected music response (${res.status}, ${contentType || "no content type"})`,
				);
			}

			const payload: unknown = await res.json();
			const data = parseSpotifyTrack(payload);
			if (!data) {
				throw new Error("Invalid music response");
			}

			if (requestSequence !== requestSequenceRef.current) return;

			trackRef.current = data;
			setTrack(data);
			setLiveProgressMs(projectPlaybackProgress(data, Date.now()));
			setStatus("ready");

			const coverUrl = data.cover_url || data.cover_url_small;
			const colorSequence = ++colorSequenceRef.current;
			const hasHistoricalTrack = !data.is_playing && !!data.title;
			const shouldExtractColor =
				!!coverUrl && (data.is_playing || hasHistoricalTrack);
			if (shouldExtractColor && coverUrl) {
				if (colorCoverUrlRef.current !== coverUrl) {
					colorCoverUrlRef.current = coverUrl;
					setColors(null);
				}
				void extractDominantColor(coverUrl).then((nextColors) => {
					if (
						requestSequence === requestSequenceRef.current &&
						colorSequence === colorSequenceRef.current &&
						colorCoverUrlRef.current === coverUrl
					) {
						setColors(nextColors);
					}
				});
			} else {
				colorCoverUrlRef.current = null;
				setColors(null);
			}
		} catch (error) {
			if (controller.signal.aborted) return;
			console.warn("[Spotify Widget] Playback refresh failed:", error);
			if (requestSequence === requestSequenceRef.current) {
				setStatus("error");
			}
		} finally {
			if (activeControllerRef.current === controller) {
				activeControllerRef.current = null;
			}
		}
	}, []);

	useEffect(() => {
		const refreshWhenActive = () => {
			if (document.visibilityState === "visible") {
				void fetchCurrentlyPlaying();
			}
		};
		const handlePageShow = () => void fetchCurrentlyPlaying();

		void fetchCurrentlyPlaying();
		const interval = window.setInterval(refreshWhenActive, 30_000);

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
			requestSequenceRef.current += 1;
			colorSequenceRef.current += 1;
			colorCoverUrlRef.current = null;
			lastFetchStartedAtRef.current = 0;
			activeControllerRef.current?.abort();
			activeControllerRef.current = null;
		};
	}, [fetchCurrentlyPlaying]);

	useEffect(() => {
		const updateProgress = () => {
			const current = trackRef.current;
			setLiveProgressMs(projectPlaybackProgress(current, Date.now()));
		};

		updateProgress();
		if (!track.is_playing) return;

		const timer = window.setInterval(updateProgress, 1000);
		return () => window.clearInterval(timer);
	}, [track.is_playing]);

	const durationMs = track.duration_ms || 0;
	const progressPercent =
		track.is_playing && durationMs > 0
			? Math.min(100, Math.max(0, (liveProgressMs / durationMs) * 100))
			: 0;

	return {
		track,
		colors,
		progressPercent,
		status,
	};
}
