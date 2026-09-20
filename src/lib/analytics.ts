type UmamiTrackFn = (
	eventOrPayload?:
		| string
		| Record<string, unknown>
		| ((props: Record<string, unknown>) => Record<string, unknown>),
	data?: Record<string, unknown>,
) => void | Promise<void>;

declare global {
	interface Window {
		umami?: {
			track: UmamiTrackFn;
			identify?: (
				idOrData: string | Record<string, unknown>,
				data?: Record<string, unknown>,
			) => void | Promise<void>;
		};
	}
}

export type AnalyticsEventData = Record<
	string,
	string | number | boolean | null | undefined
>;

const MAX_PROPS = 50;
const MAX_STRING_LEN = 500;

function sanitizeData(
	data?: AnalyticsEventData,
): AnalyticsEventData | undefined {
	if (!data) return undefined;
	const entries = Object.entries(data).filter(([, v]) => v !== undefined);
	const sliced = entries.slice(0, MAX_PROPS);
	const out: AnalyticsEventData = {};
	for (const [k, v] of sliced) {
		if (typeof v === "string") {
			out[k] = v.length > MAX_STRING_LEN ? v.slice(0, MAX_STRING_LEN) : v;
		} else if (typeof v === "number") {
			out[k] = Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0;
		} else if (typeof v === "boolean" || v === null) {
			out[k] = v;
		} else {
			out[k] = String(v).slice(0, MAX_STRING_LEN);
		}
	}
	return out;
}

function getUmami(): Window["umami"] | undefined {
	if (typeof window === "undefined") return undefined;
	return window.umami;
}

export function trackEvent(eventName: string, data?: AnalyticsEventData): void {
	try {
		if (typeof window === "undefined") return;
		if (import.meta.env.DEV) return;
		const umami = getUmami();
		if (!umami?.track) return;
		const clean = sanitizeData(data);
		if (clean && Object.keys(clean).length > 0) {
			umami.track(eventName, clean);
		} else {
			umami.track(eventName);
		}
	} catch {}
}

export function extBucket(filename: string): string {
	const parts = filename.split(".");
	if (parts.length < 2) return "none";
	const ext = parts.pop()?.toLowerCase().slice(0, 10) || "none";
	return /^[a-z0-9]+$/.test(ext) ? ext : "other";
}

export function lengthBucket(len: number): string {
	if (len <= 20) return "short";
	if (len <= 120) return "medium";
	return "long";
}
export function identifyAdmin(): void {
	try {
		if (typeof window === "undefined") return;
		if (import.meta.env.DEV) return;
		const umami = getUmami();
		if (!umami?.identify) return;
		umami.identify({ role: "admin" });
	} catch {}
}
