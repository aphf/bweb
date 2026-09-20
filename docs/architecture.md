# System Architecture

## Overview

Neosphere (bweb) is a full-stack application built on Cloudflare Workers with static assets. It combines a React-based frontend that mimics a terminal interface with backend functionality provided by a single Worker (`worker/index.ts`).

## High-Level Diagram

```mermaid
graph TD
    User[Visitor] -->|HTTPS| CF[Cloudflare Workers + Assets]
    CF -->|Static Assets| Frontend[React Frontend]
    CF -->|API Requests| Functions[Worker Handlers]
    
    subgraph "Backend (Serverless)"
        Functions -->|CRUD| D1[(D1 Database)]
        Functions -->|Assets| R2[(R2 Object Storage)]
        Functions -->|Rate Limit| KV[(KV Storage)]
        Functions -->|Notify| Telegram[Telegram Bot API]
        Functions -->|Email| Resend["Resend API (React Email)"]
        Functions -->|Weather| OpenWeather[OpenWeatherMap API]
        Functions -->|Auth| JWT[JWT Validation]
    end
    
    subgraph "Frontend (Client)"
        Frontend -->|Commands| Terminal[Terminal Emulator]
        Frontend -->|Routing| UI[Graphical Pages]
    end
```

## Data Flow: Contact Form

When a user submits a message via the `/contact` page or `contact` command:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as /api/contact
    participant KV as KV (Rate Limit)
    participant D1 as Database
    participant Ext as External Services

    User->>Frontend: Enters message
    Frontend->>API: POST /api/contact {name, email, message}
    API->>KV: Check Rate Limit (3/hour per IP)
    alt Limit Exceeded
        API-->>Frontend: 429 Too Many Requests
    end
    API->>D1: INSERT INTO messages
    API->>D1: Read notification_channels config

    Note right of API: Fire-and-forget (waitUntil), 3 retries with backoff
    par Telegram
        API->>Ext: POST api.telegram.org/bot.../sendMessage
    and Resend Email
        API->>Ext: POST api.resend.com/emails (React Email template)
    end

    API-->>Frontend: 200 OK
    Frontend-->>User: "Message sent successfully"
```

## Authentication

Authentication is used for administrative tasks (viewing messages, configuring settings).

```mermaid
sequenceDiagram
    participant Admin
    participant Terminal
    participant AuthAPI as /api/auth/login
    participant ProtectedAPI as /api/contact/inbox
    
    Admin->>Terminal: login [password]
    Terminal->>AuthAPI: POST {password}
    AuthAPI->>AuthAPI: Verify Password
    AuthAPI-->>Terminal: Return JWT Token
    Terminal->>Terminal: Store Token in localStorage
    
    Admin->>Terminal: inbox
    Terminal->>ProtectedAPI: GET (Header: Authorization: Bearer [Token])
    ProtectedAPI->>ProtectedAPI: Verify JWT
    ProtectedAPI-->>Terminal: Return Messages JSON
```

## Database Schema

The application uses Cloudflare D1 (SQLite) for persistence.

### Tables

1. **notes**: Visitor guestbook entries (mock file system).
   - `id`, `filename`, `content`, `ip`, `timestamp`
   
2. **messages**: Contact form submissions.
   - `id`, `name`, `email`, `message`, `ip`, `user_agent`, `timestamp`, `read`
   
3. **config**: Key-value store for site settings.
   - `key` (PK), `value`

4. **public**: Terminal `public_fs` filesystem (files + directories).
   - `path` (PK), `type`, `content`, `size`, `author`, `updated_at`

5. **ai_queries**: AI chat log + per-IP quota (5 for guests, unlimited for admins).
   - `id` (PK), `ip`, `prompt`, `response`, `model`, `cost`, `prompt_tokens`, `completion_tokens`, `is_admin`, `created_at`

### KV Usage (`RATE_LIMITER`)

- **Rate limits**: sliding-window counters (`login:<ip>`, `contact:<ip>`, `create_note:<ip>`, …). Approximate under concurrency (no atomic incr) — acceptable for abuse throttles.
- **Music cache**: `cache:spotify:currently_playing` (60s TTL, 15s fresh window) + `cache:spotify:last_played` (7d TTL) for history fallback.
- **Alert state**: Spotify re-auth and domain-expiry milestone machines (`pending/sent/failed` per cycle) + the music revalidation lock (60s TTL).

### Object Storage (R2)

- **neosphere-assets**: Stores gallery images and other static media.
  - Accessed via `worker/routes/gallery.ts` (Listing/mutations) and `/gallery/*` (Serving).
  - Accessed via `/media/*` (Raw asset serving).

## Key Components

### Frontend
- **Terminal Component**: Handles command parsing, history, and "filesystem" navigation.
- **Commands System**: Modular command definitions (`ls`, `cat`, `login`, `alerts`) in `src/utils/commands.tsx`.
- **Graphical Pages**: Full-screen React components overlaying the terminal (Gallery, About, Contact).

### Backend (Worker)
- **Tech**: Cloudflare Workers (native fetch + scheduled handler, no framework).
- **Location**: `/worker/index.ts` (router) + `/worker/routes/*` (handlers) + `/worker/lib/*` (shared helpers).
- **Routing**: Explicit pathname routing.
  - `worker/routes/contact.ts`: Public contact endpoint.
  - `worker/routes/contact.ts` (`handleInbox`): Protected message retrieval.
  - `worker/routes/auth-admin.ts` (`handleAdminConfig`): Configuration management.

## Performance & Security

### Rate Limiting
To prevent abuse, sensitive endpoints (`/api/contact`, `/api/auth/login`) are protected by a custom rate limiter using **Cloudflare KV**.
- **Strategy**: Variable window counters (Sliding Window approximation).
- **Limits**:
  - Login: 5 attempts / 60s per IP.
  - Contact: 3 messages / hour per IP.

### Image Optimization
Gallery images stored in R2 are optimized on-the-fly using **Cloudflare Image Resizing**.
- **Frontend**: `src/utils/imageOptimizer.ts` rewrites R2 URLs to `/cdn-cgi/image/...`.
- **Backend**: Cloudflare Edge handles resizing, format conversion (WebP/AVIF), and caching.
- **UX**: Images are lazy-loaded (`loading="lazy"`) and preloaded in the lightbox for instant navigation.

## Background Jobs & Caching

One Worker, two cron schedules (dispatched on `controller.cron` in `worker/index.ts`):

| Schedule | Job |
| :--- | :--- |
| `* * * * *` | Poll `/api/music`: refreshes the KV playback cache and runs Spotify re-auth milestone checks (30/20/10/5/1 days, KV-deduped per cycle). |
| `30 6 * * *` | RDAP expiry check for `MONITORED_DOMAINS` with milestone emails (30/20/10/5/2/1 days, KV-deduped per domain + expiry cycle). |

### Music Playback Pipeline (`worker/routes/music.ts`)

Pull-based with stale-while-revalidate:

1. **HIT** (cache < 15s, playing) → served instantly, no upstream call.
2. **STALE** (expired, playing) → served instantly + one background revalidation (KV lock dedups concurrent stampedes).
3. **MISS** → inline upstream fetch; playing responses populate cache + last-played history.
4. **Idle** → last-played history if present, else bare `{is_playing: false}`.

Upstream load stays at ~1–4 req/min regardless of visitor count. Frontend polls every 30s (visible tabs only) and projects progress client-side, so typical display lag is 15–45s. Alert emails (Spotify + domains) are Resend-idempotent per milestone + cycle, so retries never double-send.
