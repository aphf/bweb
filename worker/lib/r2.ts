export const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

export function encodeKey(key: string): string {
	return key
		.split("/")
		.map((s) => encodeURIComponent(s))
		.join("/");
}

export function decodeKey(key: string): string {
	return key
		.split("/")
		.map((p) => decodeURIComponent(p))
		.join("/");
}

export function serveR2Object(
	object: R2ObjectBody,
	cacheControl: string,
): Response {
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("Cache-Control", cacheControl);
	return new Response(object.body, { headers });
}
