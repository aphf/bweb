import { env } from "cloudflare:workers";
import type { Env } from "./env";

export function testEnv(overrides: Partial<Env> = {}): Env {
	return {
		...env,
		UMAMI_API_TOKEN: "",
		UMAMI_TOKEN: "",
		SPOTIFY_API_KEY: "",
		SPOTIFY_API_URL: "",
		STATUS_API_KEY: "",
		X_API_URL: "",
		...overrides,
	} as Env;
}
