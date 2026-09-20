import { describe, expect, it } from "vitest";
import {
	getReauthorizationNotice,
	getSpotifyRequest,
	toPublicPlaybackResponse,
} from "./spotify";

describe("toPublicPlaybackResponse", () => {
	it("passes through a full playing payload", () => {
		const data = toPublicPlaybackResponse({
			is_playing: true,
			type: "track",
			title: "Ends of the Earth",
			artist: "Lord Huron",
			duration_ms: 284146,
			progress_ms: 73737,
			progress_percent: 25.95,
			timestamp: 123,
		});
		expect(data.is_playing).toBe(true);
		expect(data.title).toBe("Ends of the Earth");
		expect(data.duration_ms).toBe(284146);
	});

	it("accepts a minimal payload with defaulted timestamp", () => {
		const before = Date.now();
		const data = toPublicPlaybackResponse({ is_playing: true });
		expect(data.is_playing).toBe(true);
		expect(data.timestamp).toBeGreaterThanOrEqual(before);
	});

	it("clamps percentages and durations", () => {
		const data = toPublicPlaybackResponse({
			is_playing: true,
			duration_ms: -5,
			progress_ms: -1,
			progress_percent: 150,
		});
		expect(data.duration_ms).toBe(0);
		expect(data.progress_ms).toBe(0);
		expect(data.progress_percent).toBe(100);
	});

	it("throws on invalid payloads", () => {
		expect(() => toPublicPlaybackResponse(null)).toThrow();
		expect(() => toPublicPlaybackResponse({})).toThrow();
		expect(() => toPublicPlaybackResponse({ is_playing: "yes" })).toThrow();
	});
});

describe("getReauthorizationNotice", () => {
	const notice = {
		status: "expiring",
		reauthorize_by: "2026-10-01",
		days_remaining: 5,
		reauthorize_url: "https://example.com/reauth",
		message: "expiring soon",
	};

	it("extracts a complete notice", () => {
		expect(getReauthorizationNotice({ reauthorization: notice })).toEqual(
			notice,
		);
	});

	it("returns null when absent or incomplete", () => {
		expect(getReauthorizationNotice({})).toBeNull();
		expect(getReauthorizationNotice(null)).toBeNull();
		expect(
			getReauthorizationNotice({
				reauthorization: { ...notice, days_remaining: undefined },
			}),
		).toBeNull();
	});
});

describe("getSpotifyRequest", () => {
	it("returns null with no configuration", () => {
		expect(getSpotifyRequest({})).toBeNull();
	});

	it("uses the default endpoint with an API key", () => {
		const req = getSpotifyRequest({ SPOTIFY_API_KEY: "k" });
		expect(req?.url).toContain("api.spotify.com");
		expect(req?.headers.Authorization).toBe("Bearer k");
	});

	it("prefers a custom URL without requiring a key", () => {
		const req = getSpotifyRequest({ SPOTIFY_API_URL: "https://proxy/x" });
		expect(req?.url).toBe("https://proxy/x");
		expect(req?.headers.Authorization).toBeUndefined();
	});
});
