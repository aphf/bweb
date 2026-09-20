// Env re-exports the wrangler-generated bindings (`npm run cf-typegen`
// writes worker-configuration.d.ts from wrangler.jsonc) plus the secrets
// provisioned via `wrangler secret put` / `.dev.vars`, which intentionally
// never appear in wrangler.jsonc. Rerun cf-typegen after config changes.
export interface Env extends Cloudflare.Env {
	ADMIN_PASSWORD?: string;
	JWT_SECRET?: string;
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_CHAT_ID?: string;
	MONITORED_DOMAINS?: string;
	DOMAIN_RENEW_URL?: string;
}
