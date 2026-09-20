export interface ExtractedColors {
	rgb: [number, number, number];
	accentColor: string;
	glowColor: string;
	ambientGlow: string;
	borderColor: string;
	badgeBg: string;
	badgeText: string;
}

const DEFAULT_COLORS: ExtractedColors = {
	rgb: [161, 161, 170],
	accentColor: "rgb(212, 212, 216)",
	glowColor: "rgba(212, 212, 216, 0.3)",
	ambientGlow: "rgba(161, 161, 170, 0.14)",
	borderColor: "rgba(212, 212, 216, 0.24)",
	badgeBg: "rgba(212, 212, 216, 0.12)",
	badgeText: "rgb(228, 228, 231)",
};

interface ColorBucket {
	r: number;
	g: number;
	b: number;
	weight: number;
}

const colorCache = new Map<string, ExtractedColors>();
const pendingExtractions = new Map<string, Promise<ExtractedColors>>();

function normalizeAccent(
	r: number,
	g: number,
	b: number,
): [number, number, number] {
	const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	const max = Math.max(r, g, b);
	if (luminance < 0.35) {
		const factor = Math.min(2.2, 1 + (0.35 - luminance) * 2.5);
		return [
			Math.min(255, Math.round(r * factor + (255 - max) * 0.1)),
			Math.min(255, Math.round(g * factor + (255 - max) * 0.1)),
			Math.min(255, Math.round(b * factor + (255 - max) * 0.1)),
		];
	}
	if (luminance > 0.85) {
		const factor = 0.85 / luminance;
		return [
			Math.round(r * factor),
			Math.round(g * factor),
			Math.round(b * factor),
		];
	}
	return [r, g, b];
}

function createPalette(r: number, g: number, b: number): ExtractedColors {
	const [accentR, accentG, accentB] = normalizeAccent(r, g, b);
	return {
		rgb: [r, g, b],
		accentColor: `rgb(${accentR}, ${accentG}, ${accentB})`,
		glowColor: `rgba(${r}, ${g}, ${b}, 0.40)`,
		ambientGlow: `rgba(${r}, ${g}, ${b}, 0.22)`,
		borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
		badgeBg: `rgba(${accentR}, ${accentG}, ${accentB}, 0.16)`,
		badgeText: `rgb(${Math.min(255, accentR + 28)}, ${Math.min(255, accentG + 28)}, ${Math.min(255, accentB + 28)})`,
	};
}

export function extractDominantColor(
	imageUrl?: string,
): Promise<ExtractedColors> {
	if (
		!imageUrl ||
		typeof window === "undefined" ||
		typeof document === "undefined"
	) {
		return Promise.resolve(DEFAULT_COLORS);
	}

	const cached = colorCache.get(imageUrl);
	if (cached) return Promise.resolve(cached);

	const pending = pendingExtractions.get(imageUrl);
	if (pending) return pending;

	const extraction = new Promise<ExtractedColors>((resolve) => {
		const img = new Image();
		let settled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const finish = (colors: ExtractedColors, shouldCache: boolean) => {
			if (settled) return;
			settled = true;
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			img.onload = null;
			img.onerror = null;
			if (shouldCache) colorCache.set(imageUrl, colors);
			resolve(colors);
		};

		img.crossOrigin = "anonymous";
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					finish(DEFAULT_COLORS, false);
					return;
				}

				const size = 32;
				canvas.width = size;
				canvas.height = size;
				ctx.drawImage(img, 0, 0, size, size);
				const pixels = ctx.getImageData(0, 0, size, size).data;
				const buckets = new Map<string, ColorBucket>();

				for (let index = 0; index < pixels.length; index += 4) {
					const r = pixels[index];
					const g = pixels[index + 1];
					const b = pixels[index + 2];
					const alpha = pixels[index + 3];
					if (alpha < 160) continue;

					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					if (max < 18 || min > 242) continue;

					const saturation = max === 0 ? 0 : (max - min) / max;
					const lightness = (max + min) / 510;
					const weight =
						(0.5 + saturation * 1.15) *
						(0.72 + (1 - Math.abs(lightness - 0.52)) * 0.28);
					const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
					const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0 };
					bucket.r += r * weight;
					bucket.g += g * weight;
					bucket.b += b * weight;
					bucket.weight += weight;
					buckets.set(key, bucket);
				}

				let selected: ColorBucket | null = null;
				for (const bucket of buckets.values()) {
					if (!selected || bucket.weight > selected.weight) selected = bucket;
				}

				if (!selected || selected.weight === 0) {
					finish(DEFAULT_COLORS, false);
					return;
				}

				finish(
					createPalette(
						Math.round(selected.r / selected.weight),
						Math.round(selected.g / selected.weight),
						Math.round(selected.b / selected.weight),
					),
					true,
				);
			} catch {
				finish(DEFAULT_COLORS, false);
			}
		};

		img.onerror = () => finish(DEFAULT_COLORS, false);
		timeoutId = setTimeout(() => finish(DEFAULT_COLORS, false), 3000);
		img.src = imageUrl;
	});

	const trackedExtraction = extraction.finally(() => {
		pendingExtractions.delete(imageUrl);
	});
	pendingExtractions.set(imageUrl, trackedExtraction);
	return trackedExtraction;
}
