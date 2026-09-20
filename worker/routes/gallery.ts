import type { Env } from "../env";
import { verifyAuth } from "../lib/auth";
import { json, methodNotAllowed } from "../lib/json";

interface PhotoData {
	url: string;
	key: string;
	caption: string;
	filename: string;
}

interface AlbumData {
	title: string;
	count: number;
	cover: string[];
	photos: PhotoData[];
	category: string;
}

export async function handleGalleryApi(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method === "GET") {
		return handleGet(env);
	}

	if (!(await verifyAuth(request, env))) {
		return json({ error: "Unauthorized" }, 401);
	}

	try {
		if (request.method === "POST") return await handlePost(request, env);
		if (request.method === "PUT") return await handlePut(request, env);
		if (request.method === "DELETE") return await handleDelete(request, env);
		return methodNotAllowed(["GET", "POST", "PUT", "DELETE"]);
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}

async function handleGet(env: Env): Promise<Response> {
	const albums: Record<string, AlbumData> = {};

	let truncated = true;
	let cursor: string | undefined;

	while (truncated) {
		const listing = await env.neosphere_assets.list({
			include: ["customMetadata", "httpMetadata"],
			cursor,
		} as R2ListOptions);

		for (const object of listing.objects) {
			if (!object.key.includes("/")) continue;

			const lastSlash = object.key.lastIndexOf("/");
			const albumPath = object.key.substring(0, lastSlash);
			const filename = object.key.substring(lastSlash + 1);

			if (albumPath === "assets") continue;
			if (filename === ".meta") {
				if (!albums[albumPath]) {
					albums[albumPath] = {
						title: albumPath,
						count: 0,
						cover: [],
						photos: [],
						category: "Gallery",
					};
				}
				albums[albumPath].category =
					object.customMetadata?.category || "Gallery";
				continue;
			}

			const hasImageExt = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
			const hasImageContentType = /^image\//i.test(
				object.httpMetadata?.contentType || "",
			);
			if (!hasImageExt && !hasImageContentType) continue;

			if (!albums[albumPath]) {
				albums[albumPath] = {
					title: albumPath,
					count: 0,
					cover: [],
					photos: [],
					category: "Gallery",
				};
			}

			const url = `/gallery/${object.key}`;
			albums[albumPath].photos.push({
				url,
				key: object.key,
				caption: object.customMetadata?.caption || "",
				filename,
			});
			albums[albumPath].count++;

			let parent = albumPath;
			while (parent.includes("/")) {
				parent = parent.substring(0, parent.lastIndexOf("/"));
				if (!albums[parent]) {
					albums[parent] = {
						title: parent,
						count: 0,
						cover: [],
						photos: [],
						category: "Gallery",
					};
				}
			}
		}

		truncated = listing.truncated;
		cursor = listing.truncated
			? (listing as R2Objects & { cursor?: string }).cursor
			: undefined;
	}

	const albumList = Object.values(albums);
	for (const album of albumList) {
		if (album.photos.length > 0) {
			album.cover = album.photos.slice(0, 4).map((p) => p.url);
		} else {
			const prefix = `${album.title}/`;
			const subWithPhotos = albumList.find(
				(sub) => sub.title.startsWith(prefix) && sub.photos.length > 0,
			);
			album.cover = subWithPhotos
				? subWithPhotos.photos.slice(0, 4).map((p) => p.url)
				: [];
		}
	}

	return json(albumList);
}

async function handlePost(request: Request, env: Env): Promise<Response> {
	const formData = await request.formData();
	const action = formData.get("action");

	if (action === "upload") {
		const file = formData.get("file");
		const album = formData.get("album");
		const caption = formData.get("caption") || "";

		if (!file || !album) throw new Error("Missing file or album");

		const safeAlbum = String(album)
			.replace(/[^a-zA-Z0-9 _\-/]/g, "")
			.replace(/\/+/g, "/")
			.replace(/^\/|\/$/g, "")
			.trim();
		if (!safeAlbum || safeAlbum.includes(".."))
			throw new Error("Invalid album name");

		const fileName = (file as File).name.replace(/[^a-zA-Z0-9 ._-]/g, "");
		const key = `${safeAlbum}/${fileName}`;

		await env.neosphere_assets.put(key, file as File, {
			customMetadata: { caption: String(caption) },
		});

		return json({ success: true, key });
	}

	return json({ error: "Invalid action" }, 400);
}

async function handlePut(request: Request, env: Env): Promise<Response> {
	const body = (await request.json()) as {
		action?: string;
		key?: string;
		caption?: string;
		newName?: string;
		album?: string;
		category?: string;
		oldName?: string;
	};
	const { action, key, caption, newName } = body;

	if (action === "update-caption") {
		if (!key) throw new Error("Missing key");

		const object = await env.neosphere_assets.get(key);
		if (!object) throw new Error("Object not found");

		await env.neosphere_assets.put(key, object.body, {
			customMetadata: { caption: caption || "" },
			httpMetadata: object.httpMetadata,
		});

		return json({ success: true });
	}

	if (action === "update-category") {
		const { album, category } = body;
		if (!album) throw new Error("Missing album");

		const metaKey = `${album}/.meta`;
		await env.neosphere_assets.put(metaKey, "", {
			customMetadata: { category: category || "Gallery" },
		});

		return json({ success: true });
	}

	if (action === "rename-photo") {
		if (!key || !newName) throw new Error("Missing params");

		const safeName = newName.replace(/[^a-zA-Z0-9 ._-]/g, "");
		if (!safeName || safeName.includes(".."))
			throw new Error("Invalid file name");

		const object = await env.neosphere_assets.get(key);
		if (!object) throw new Error("Object not found");

		const parts = key.split("/");
		const album = parts.slice(0, -1).join("/");
		const originalExt = key.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0] ?? "";
		const newKey = `${album}/${safeName}${originalExt}`;

		await env.neosphere_assets.put(newKey, object.body, {
			customMetadata: object.customMetadata,
			httpMetadata: object.httpMetadata,
		});

		await env.neosphere_assets.delete(key);

		return json({ success: true, newKey });
	}

	if (action === "rename-album") {
		const { oldName } = body;
		if (!newName || !oldName) throw new Error("Missing params");
		const safeNewName = newName
			.replace(/[^a-zA-Z0-9 _\-/]/g, "")
			.replace(/\/+/g, "/")
			.replace(/^\/|\/$/g, "");
		if (!safeNewName || safeNewName.includes(".."))
			throw new Error("Invalid album name");

		const oldDepth = oldName.split("/").length;
		let truncated = true;
		let cursor: string | undefined;

		while (truncated) {
			const list = await env.neosphere_assets.list({
				prefix: `${oldName}/`,
				cursor,
			});

			const BATCH_SIZE = 10;
			const objects = list.objects;
			for (let start = 0; start < objects.length; start += BATCH_SIZE) {
				const batch = objects.slice(start, start + BATCH_SIZE);
				await Promise.all(
					batch.map(async (obj) => {
						const remainder = obj.key.split("/").slice(oldDepth).join("/");
						const newKey = `${safeNewName}/${remainder}`;

						const o = await env.neosphere_assets.get(obj.key);
						if (!o) throw new Error(`Object not found: ${obj.key}`);
						await env.neosphere_assets.put(newKey, o.body, {
							customMetadata: o.customMetadata,
							httpMetadata: o.httpMetadata,
						});
						await env.neosphere_assets.delete(obj.key);
					}),
				);
			}

			truncated = list.truncated;
			cursor = list.truncated
				? (list as R2Objects & { cursor?: string }).cursor
				: undefined;
		}

		return json({ success: true });
	}

	return json({ error: "Invalid action" }, 400);
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
	const body = (await request.json()) as { key?: string; album?: string };
	const { key, album } = body;

	if (key) {
		await env.neosphere_assets.delete(key);
		return json({ success: true });
	}

	if (album) {
		let truncated = true;
		let cursor: string | undefined;

		while (truncated) {
			const list = await env.neosphere_assets.list({
				prefix: `${album}/`,
				cursor,
			});
			const keys = list.objects.map((o) => o.key);
			if (keys.length > 0) {
				await env.neosphere_assets.delete(keys);
			}
			truncated = list.truncated;
			cursor = list.truncated
				? (list as R2Objects & { cursor?: string }).cursor
				: undefined;
		}
		return json({ success: true });
	}

	return json({ error: "Missing key or album" }, 400);
}
