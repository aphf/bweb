import type { Env } from "../env";
import { decodeKey, encodeKey, IMAGE_EXT, serveR2Object } from "../lib/r2";
import { serveSpaWithSEO } from "../lib/seo";

const PAGE_SEO: Record<
	string,
	{ title: string; description: string; url: string }
> = {
	"/about": {
		title: "About | Bahauddin Alam",
		description:
			"I build high-performance web applications and developer-focused tools with a strong emphasis on scaling, reliability, and systems-level optimization.",
		url: "https://bahauddin.org/about",
	},
	"/contact": {
		title: "Contact | Bahauddin Alam",
		description:
			"Get in touch with Bahauddin Alam. Available for new projects and collaborations.",
		url: "https://bahauddin.org/contact",
	},
	"/gallery": {
		title: "Gallery | Bahauddin Alam",
		description:
			"Explore my photography portfolio. A collection of moments captured from my travels and daily life.",
		url: "https://bahauddin.org/gallery",
	},
	"/projects": {
		title: "Projects | Bahauddin Alam",
		description:
			"Showcase of my recent projects. From web applications to system tools, explore what I've built.",
		url: "https://bahauddin.org/projects",
	},
};

export async function handleSeoPage(
	request: Request,
	env: Env,
	seoKey: string,
): Promise<Response> {
	const seo = PAGE_SEO[seoKey];
	return serveSpaWithSEO(request, env, seo);
}

export async function handleNotesPage(
	request: Request,
	env: Env,
): Promise<Response> {
	const url = new URL(request.url);
	const noteParam = url.searchParams.get("note");

	let title = "Notes | Bahauddin Alam";
	let description =
		"My personal digital garden. A collection of notes, thoughts, and learnings on software development and technology.";
	let pageUrl = "https://bahauddin.org/notes";

	if (noteParam) {
		title = `${noteParam} | Notes`;
		description = `Read ${noteParam} on my personal digital garden.`;
		pageUrl = `https://bahauddin.org/notes?note=${encodeURIComponent(noteParam)}`;
	}

	return serveSpaWithSEO(request, env, { title, description, url: pageUrl });
}

export function handleNotFoundPage(
	request: Request,
	env: Env,
): Promise<Response> {
	return serveSpaWithSEO(
		request,
		env,
		{
			title: "404 - Page Not Found | Bahauddin Alam",
			description:
				"The requested page could not be found in Neosphere. Explore available pages or return to the desktop.",
			url: request.url,
		},
		404,
	);
}

// Consolidated /gallery + /gallery/* handler.
// Exact /gallery is handled by handleSeoPage; this covers /gallery/<path>.
export async function handleGalleryPath(
	request: Request,
	env: Env,
	rest: string,
): Promise<Response> {
	if (!rest) {
		return handleSeoPage(request, env, "/gallery");
	}

	const r2Key = decodeKey(rest);

	if (IMAGE_EXT.test(rest)) {
		const object = await env.neosphere_assets.get(r2Key);
		if (!object) return new Response("Not Found", { status: 404 });
		return serveR2Object(object, "public, max-age=31536000, immutable");
	}

	let ogTitle = "";
	let ogDescription = "";
	let coverUrl = "";

	let isPhoto = false;
	if (r2Key.includes("/")) {
		const photoListing = await env.neosphere_assets
			.list({ prefix: `${r2Key}.`, limit: 5 })
			.catch(() => null);
		const match = photoListing?.objects.find((o) => IMAGE_EXT.test(o.key));
		if (match) {
			isPhoto = true;
			const rawFilename = decodeURIComponent(rest.split("/").pop() || rest);
			const albumParts = rest
				.split("/")
				.slice(0, -1)
				.map((p) => decodeURIComponent(p));
			const albumName = albumParts.join(" / ");
			coverUrl = new URL(`/gallery/${encodeKey(match.key)}`, request.url).href;
			ogTitle = albumName ? `${rawFilename} — ${albumName}` : rawFilename;
			ogDescription = albumName
				? `Photo from the ${albumName} album`
				: "View photo";
		}
	}

	if (!isPhoto) {
		const albumTitle = decodeURIComponent(rest.split("/").pop() || rest);
		ogTitle = `${albumTitle} — Gallery`;
		ogDescription = `Browse the ${albumTitle} album`;
		const listing = await env.neosphere_assets
			.list({ prefix: `${r2Key}/`, limit: 10 })
			.catch(() => null);
		if (listing) {
			for (const obj of listing.objects) {
				if (IMAGE_EXT.test(obj.key)) {
					coverUrl = new URL(`/gallery/${encodeKey(obj.key)}`, request.url)
						.href;
					break;
				}
			}
		}
	}

	return serveSpaWithSEO(request, env, {
		title: ogTitle,
		description: ogDescription,
		url: request.url,
		image: coverUrl || undefined,
	});
}

export async function handleMedia(
	_request: Request,
	env: Env,
	rest: string,
): Promise<Response> {
	if (!rest) {
		return new Response("Not Found", { status: 404 });
	}

	const object = await env.neosphere_assets.get(decodeKey(rest));

	if (object === null) {
		return new Response("Not Found", { status: 404 });
	}

	return serveR2Object(object, "public, max-age=86400");
}

export async function handleAssets(
	request: Request,
	env: Env,
	rest: string,
): Promise<Response> {
	if (!rest) {
		return new Response("Not Found", { status: 404 });
	}

	const object = await env.neosphere_assets.get(`assets/${decodeKey(rest)}`);

	if (object === null) {
		return env.ASSETS.fetch(request);
	}

	return serveR2Object(object, "public, max-age=86400");
}
