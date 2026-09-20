# Neosphere

Interactive web-desktop portfolio (React + Vite SPA) on Cloudflare Worker with D1, KV, and R2.

## Features

- **Neosphere OS:** functional terminal with filesystem, admin commands (`login`, `inbox`, `alerts`), and graphical apps (Gallery, Notes, Contact).
- **API:** contact inbox, notes guestbook, gallery management, LLM chatbot, Spotify now-playing, X and GitHub profile view in terminal, etc. 
- **Alerts:** Built in Telegram + email notifications, Spotify re-auth and domain-expiry alert emails.
- **SEO:** per-route meta injection, R2-backed gallery/media serving.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind |
| Backend | Native Cloudflare Worker, zero dependecies |
| Persistance | D1 (`DB`), KV (`RATE_LIMITER`), R2 (`neosphere-assets`) |
| Email | Resend + React Email (`emails/`) |
| Deploy | GitHub Actions → `wrangler deploy` |

Details: `docs/architecture.md`, `docs/workflow.md`.

## Quickstart

```bash
pnpm install
pnpm dev:worker        # Worker + assets at http://127.0.0.1:8787
```

Local bindings are simulated and empty. Seed D1 once for DB routes:

```bash
pnpm exec wrangler d1 execute neosphere-db --local --file=./schema.sql
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Regenerate types after config changes: `pnpm cf-typegen`.

## Secrets

Non-secret config lives in `wrangler.jsonc` (`SPOTIFY_API_URL`, `X_API_URL`). Everything else is a secret. Upload all at once:

```bash
# secrets.json — throwaway file, delete right after. NEVER COMMIT!!!
{
  "ADMIN_PASSWORD": "...",
  "JWT_SECRET": "...",
  "TELEGRAM_BOT_TOKEN": "...",
  "TELEGRAM_CHAT_ID": "...",
  "RESEND_API_KEY": "...",
  "CONTACT_EMAIL_TO": "...",
  "CONTACT_EMAIL_FROM": "...",
  "OPENROUTER_API_KEY": "...",
  "OPENWEATHER_API_KEY": "...",
  "STATUS_API_KEY": "...",
  "SPOTIFY_API_KEY": "...",
  "MONITORED_DOMAINS": "example.org,example.com"
}
```

```bash
pnpm exec wrangler secret bulk /path/to/secrets.json
pnpm exec wrangler secret list   # verify 
```

Only `ADMIN_PASSWORD` is strictly required; every other feature degrades gracefully without its key (see `docs/workflow.md`).

## Deploy

Push to `main` — `.github/workflows/deploy.yml` builds and runs `wrangler deploy`. Manual:

```bash
pnpm build
pnpm deploy
```

## Project structure

```
worker/          # entry (index.ts), routes/, lib/
src/             # React frontend
emails/          # React Email templates
public/          # static files (_headers, robots, llms.txt)
schema.sql       # D1 baseline schema
wrangler.jsonc   # Worker config (assets, bindings, cron)
```

## License

MIT [LICENSE](LICENSE).
