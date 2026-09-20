export interface ImageOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: "auto" | "webp" | "avif" | "json";
	fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
}

export const optimizeImage = (
	url: string,
	options: ImageOptions = {},
): string => {
	if (!url) return "";

	if (
		typeof window !== "undefined" &&
		(window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1")
	) {
		return url;
	}

	const params: string[] = [];

	if (options.width) params.push(`width=${options.width}`);
	if (options.height) params.push(`height=${options.height}`);
	if (options.quality) params.push(`quality=${options.quality}`);
	params.push(`format=${options.format || "auto"}`);
	if (options.fit) params.push(`fit=${options.fit}`);

	const optionsStr = params.join(",");

	const cleanUrl = url.startsWith("/") ? url : `/${url}`;

	return `/cdn-cgi/image/${optionsStr}${cleanUrl}`;
};
