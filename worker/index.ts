import type { Env } from "./env";
import { checkDomainExpiries } from "./lib/domain";
import { json, withPoweredBy } from "./lib/json";
import { handleAi } from "./routes/ai";
import {
	handleAdminConfig,
	handleAuthCheck,
	handleAuthLogin,
	handleAuthLogout,
} from "./routes/auth-admin";
import { handleContactSubmit, handleInbox } from "./routes/contact";
import { handleGalleryApi } from "./routes/gallery";
import {
	handlePing,
	handleStatus,
	handleWeather,
	handleX,
} from "./routes/misc";
import { handleMusic } from "./routes/music";
import { handleNoteByFilename, handleNotesList } from "./routes/notes";
import {
	handleAssets,
	handleGalleryPath,
	handleMedia,
	handleNotesPage,
	handleNotFoundPage,
	handleSeoPage,
} from "./routes/pages-assets";
import { handlePublicFs } from "./routes/public-fs";
import { handleSharedNote } from "./routes/shared-note";

function stripTrailingSlash(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith("/")) {
		return pathname.slice(0, -1);
	}
	return pathname;
}

async function route(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const url = new URL(request.url);
	const pathname = stripTrailingSlash(url.pathname);

	// ---- API ----
	if (pathname === "/api/contact" && request.method === "POST") {
		return handleContactSubmit(request, env, ctx);
	}
	if (pathname === "/api/contact/inbox") {
		return handleInbox(request, env);
	}
	if (pathname === "/api/admin/config") {
		return handleAdminConfig(request, env);
	}
	if (pathname === "/api/auth/login" && request.method === "POST") {
		return handleAuthLogin(request, env);
	}
	if (pathname === "/api/auth/check" && request.method === "GET") {
		return handleAuthCheck(request, env);
	}
	if (pathname === "/api/auth/logout" && request.method === "POST") {
		return handleAuthLogout();
	}
	if (pathname === "/api/gallery" || pathname.startsWith("/api/gallery/")) {
		if (pathname !== "/api/gallery") {
			return json({ error: "Not Found" }, 404);
		}
		return handleGalleryApi(request, env);
	}
	if (pathname === "/api/notes") {
		return handleNotesList(request, env);
	}
	if (pathname.startsWith("/api/notes/")) {
		const filename = pathname.slice("/api/notes/".length);
		if (!filename || filename.includes("/")) {
			return json({ error: "Not found" }, 404);
		}
		return handleNoteByFilename(request, env, filename);
	}
	if (
		pathname === "/api/music" ||
		pathname === "/api/player/currently-playing"
	) {
		return handleMusic(request, env, ctx);
	}
	if (pathname === "/api/public_fs") {
		return handlePublicFs(request, env);
	}
	if (pathname === "/api/status") {
		return handleStatus(request, env);
	}
	if (pathname === "/api/ping") {
		return handlePing(request);
	}
	if (pathname === "/api/weather") {
		return handleWeather(request, env);
	}
	if (pathname === "/api/x" || pathname.startsWith("/api/x/")) {
		return handleX(request, env);
	}
	if (pathname === "/api/ai" && request.method === "POST") {
		return handleAi(request, env, ctx);
	}
	if (pathname.startsWith("/api/")) {
		return json({ error: "Not Found" }, 404);
	}

	// ---- SEO pages ----
	if (
		pathname === "/about" ||
		pathname === "/contact" ||
		pathname === "/projects"
	) {
		return handleSeoPage(request, env, pathname);
	}
	if (pathname === "/notes") {
		return handleNotesPage(request, env);
	}
	if (pathname === "/404") {
		return handleNotFoundPage(request, env);
	}

	// ---- R2-backed paths (pathname slicing preserves encoded keys) ----
	if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
		const rest =
			pathname === "/gallery" ? "" : pathname.slice("/gallery/".length);
		return handleGalleryPath(request, env, rest);
	}
	if (pathname === "/media" || pathname.startsWith("/media/")) {
		const rest = pathname === "/media" ? "" : pathname.slice("/media/".length);
		return handleMedia(request, env, rest);
	}
	if (pathname === "/assets" || pathname.startsWith("/assets/")) {
		const rest =
			pathname === "/assets" ? "" : pathname.slice("/assets/".length);
		return handleAssets(request, env, rest);
	}
	if (pathname === "/shared/notes" || pathname.startsWith("/shared/notes/")) {
		const rest =
			pathname === "/shared/notes"
				? ""
				: pathname.slice("/shared/notes/".length);
		if (!rest || rest.includes("/")) {
			return new Response("Note not found", { status: 404 });
		}
		return handleSharedNote(request, env, rest);
	}

	// ---- Static assets (SPA fallback handled by assets config) ----
	return env.ASSETS.fetch(request);
}

const RETRY_DELAYS_MS = [1_000, 3_000] as const;

function sleep(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function refreshMusicEndpoint(endpoint: string): Promise<void> {
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
		try {
			const response = await fetch(endpoint, {
				headers: {
					Accept: "application/json",
					"User-Agent": "neosphere-spotify-reauth-cron/1.0",
				},
			});
			if (response.ok) {
				console.log(
					JSON.stringify({
						event: "spotify_reauth_cron_complete",
						cache_status: response.headers.get("X-Cache-Status"),
					}),
				);
				return;
			}
			if (response.status < 500 || attempt >= RETRY_DELAYS_MS.length) {
				throw new Error(`Music endpoint returned ${response.status}`);
			}
		} catch (error) {
			if (attempt >= RETRY_DELAYS_MS.length) throw error;
		}
		await sleep(RETRY_DELAYS_MS[attempt]);
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		try {
			const response = await route(request, env, ctx);
			return withPoweredBy(response);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(
				JSON.stringify({
					message: "unhandled error",
					error: message,
					path: new URL(request.url).pathname,
				}),
			);
			return withPoweredBy(json({ error: "Internal server error" }, 500));
		}
	},

	async scheduled(
		controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<void> {
		if (controller.cron === "30 6 * * *") {
			try {
				await checkDomainExpiries(env);
			} catch (error) {
				console.error(
					JSON.stringify({
						event: "domain_expiry_cron_failed",
						error: error instanceof Error ? error.message : String(error),
					}),
				);
			}
			return;
		}
		const endpoint = env.MUSIC_ENDPOINT || "https://bahauddin.org/api/music";
		await refreshMusicEndpoint(endpoint);
	},
} satisfies ExportedHandler<Env>;
