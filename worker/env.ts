export interface Env extends Omit<Cloudflare.Env, "UMAMI_API_TOKEN"> {
	ADMIN_PASSWORD?: string;
	JWT_SECRET?: string;
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_CHAT_ID?: string;
	MONITORED_DOMAINS?: string;
	DOMAIN_RENEW_URL?: string;
	UMAMI_BASE_URL?: string;
	UMAMI_WEBSITE_ID?: string;
	UMAMI_API_TOKEN?: string;
	UMAMI_TOKEN?: string;
}
