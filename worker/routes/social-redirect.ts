export const SOCIAL_SOURCES = [
	"x",
	"github",
	"linkedin",
	"telegram",
	"instagram",
] as const;

export type SocialSource = (typeof SOCIAL_SOURCES)[number];

const PROFILE_URLS: Record<SocialSource, string> = {
	x: "https://x.com/bahauddinalam",
	github: "https://github.com/bahauddin-alam",
	linkedin: "https://www.linkedin.com/in/bahauddinalam",
	telegram: "https://t.me/bahauddinalam",
	instagram: "https://www.instagram.com/bahauddin_alam",
};

// Inbound: bio links -> site (via cookie attribution)
export const SOCIAL_INBOUND_MAP: Record<string, SocialSource> = {
	"/via/x": "x",
	"/via/twitter": "x",
	"/via/github": "github",
	"/via/gh": "github",
	"/via/linkedin": "linkedin",
	"/via/li": "linkedin",
	"/via/telegram": "telegram",
	"/via/tg": "telegram",
	"/via/instagram": "instagram",
	"/via/ig": "instagram",
};

// Outbound: short links -> profiles
export const SOCIAL_OUTBOUND_MAP: Record<string, SocialSource> = {
	"/x": "x",
	"/twitter": "x",
	"/github": "github",
	"/gh": "github",
	"/linkedin": "linkedin",
	"/li": "linkedin",
	"/telegram": "telegram",
	"/tg": "telegram",
	"/instagram": "instagram",
	"/ig": "instagram",
};

export const ATTRIBUTION_COOKIE = "bweb_attr";

export function getSocialSource(pathname: string): SocialSource | null {
	return SOCIAL_INBOUND_MAP[pathname] ?? null;
}

export function getInboundSource(pathname: string): SocialSource | null {
	return SOCIAL_INBOUND_MAP[pathname] ?? null;
}

export function getOutboundTarget(pathname: string): string | null {
	const source = SOCIAL_OUTBOUND_MAP[pathname];
	return source ? PROFILE_URLS[source] : null;
}

export function handleSocialRedirect(
	request: Request,
	source: SocialSource,
): Response {
	const url = new URL(request.url);
	const target = `${url.origin}/`;
	return new Response(null, {
		status: 302,
		headers: {
			Location: target,
			"Set-Cookie": `${ATTRIBUTION_COOKIE}=${source}; Path=/; Max-Age=300; SameSite=Lax`,
			"Cache-Control": "no-store",
		},
	});
}

export function handleOutboundRedirect(target: string): Response {
	return new Response(null, {
		status: 302,
		headers: {
			Location: target,
			"Cache-Control": "no-store",
		},
	});
}
