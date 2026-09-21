# Neosphere

[![CI](https://img.shields.io/github/actions/workflow/status/aphf/bweb/ci.yml?branch=master&label=CI&logo=github&logoColor=white&labelColor=%235A5A5A&color=%232EBC4F)](https://github.com/aphf/bweb/actions/workflows/ci.yml) [![Deploy to Cloudflare Workers](https://img.shields.io/github/actions/workflow/status/aphf/bweb/deploy.yml?branch=master&label=deploy&logo=cloudflare&labelColor=%235A5A5A&color=%232EBC4F)](https://github.com/aphf/bweb/actions/workflows/deploy.yml) [![Status](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fstatus.bahauddin.org%2Fapi%2Fstatus%2Fcurrent.json&query=%24.status.description&label=status&labelColor=%235A5A5A&color=%232EBC4F)](https://status.bahauddin.org)

Interactive web-desktop portfolio (React + Vite SPA) on Cloudflare Worker with D1, KV, and R2.

## Features

- **Neosphere OS:** functional terminal with filesystem, admin commands (`login`, `inbox`, `alerts`), and graphical apps (Gallery, Notes, Contact).
- **API:** contact inbox, notes guestbook, gallery management, LLM chatbot, Spotify now-playing, visitor counter, X and GitHub profile view in terminal, etc. 
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
  "UMAMI_API_TOKEN": "...",
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
