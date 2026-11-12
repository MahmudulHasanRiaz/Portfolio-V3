# Environment Variables

> **PRD Reference:** [PRD.md](../PRD.md) — Infrastructure Architecture, Deployment Architecture  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Variable Naming Convention

| Prefix | Scope | Visibility |
|--------|-------|------------|
| `NEXT_PUBLIC_*` | Client + Server | Exposed to browser |
| `*` (no prefix) | Server only | Never exposed to browser |
| `CRON_SECRET` | Server (cron endpoints) | Secret |

---

## 2. Required Variables

### 2.1 Database

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:6543/db` | Yes | Supabase PostgreSQL connection string (with password) |
| `DATABASE_POOL_URL` | `postgresql://user:pass@host:6543/db?pgbouncer=true` | Yes | Supabase pooled connection string |

### 2.2 Authentication

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `BETTER_AUTH_SECRET` | <64-char-random-base64> | Yes | Secret key for session encryption |
| `BETTER_AUTH_URL` | `https://riaz.dev` | Yes | Public URL of the auth server |

### 2.3 Cloudflare R2 (Storage)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `R2_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` | Yes | R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | `<access-key>` | Yes | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | `<secret-key>` | Yes | R2 secret access key |
| `R2_BUCKET` | `personal-brand-os-prod` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | `https://cdn.riaz.dev` | Yes | Public CDN URL for assets |

### 2.4 Email (Resend)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `RESEND_API_KEY` | `re_<key>` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | `noreply@riaz.dev` | Yes | Sender email address |
| `RESEND_FROM_NAME` | `Mahmudul Hasan Riaz` | Yes | Sender display name |

### 2.5 Monitoring (Sentry)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://<key>@<project>.ingest.sentry.io/<id>` | Yes | Sentry DSN (public, safe to expose) |
| `SENTRY_AUTH_TOKEN` | `<auth-token>` | No | Sentry CLI auth token (for source maps) |
| `SENTRY_ORG` | `personal-brand-os` | No | Sentry organization slug |
| `SENTRY_PROJECT` | `personal-brand-os` | No | Sentry project slug |

### 2.6 Analytics

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_CLARITY_ID` | `<clarity-project-id>` | Yes | Microsoft Clarity project ID |
| `NEXT_PUBLIC_UMAMI_URL` | `https://umami.example.com` | No | Self-hosted Umami URL |
| `NEXT_PUBLIC_UMAMI_SITE_ID` | `<site-id>` | No | Umami site identifier |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | No | Google Analytics (optional future) |

### 2.7 Notifications

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | `<bot-token>` | Yes | Telegram bot token |
| `TELEGRAM_CHAT_ID` | `<chat-id>` | Yes | Telegram notification target chat ID |
| `WHATSAPP_API_KEY` | `<api-key>` | No | WhatsApp Business API key |
| `WHATSAPP_PHONE_NUMBER_ID` | `<phone-id>` | No | WhatsApp sender phone number ID |

### 2.8 Cron Jobs

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `CRON_SECRET` | <64-char-random-base64> | Yes | Shared secret for cron endpoint authentication |

### 2.9 Application

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_URL` | `https://riaz.dev` | Yes | Public production URL |
| `NEXT_PUBLIC_SITE_NAME` | `Mahmudul Hasan Riaz` | Yes | Site name for SEO/schema |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | `Software Engineer...` | No | Site description for SEO |
| `NODE_ENV` | `production` | Yes | Set by Vercel automatically |
| `LOG_LEVEL` | `info` | No | Logging level (debug, info, warn, error) |

---

## 3. Environment-Specific Values

### 3.1 Production

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase production project connection string |
| `BETTER_AUTH_URL` | `https://riaz.dev` |
| `R2_BUCKET` | `personal-brand-os-prod` |
| `R2_PUBLIC_URL` | `https://cdn.riaz.dev` |
| `NEXT_PUBLIC_URL` | `https://riaz.dev` |
| `NEXT_PUBLIC_SENTRY_DSN` | Production Sentry project DSN |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |

### 3.2 Staging

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase staging project connection string |
| `BETTER_AUTH_URL` | `https://staging.riaz.dev` |
| `R2_BUCKET` | `personal-brand-os-staging` |
| `R2_PUBLIC_URL` | `https://staging-cdn.riaz.dev` |
| `NEXT_PUBLIC_URL` | `https://staging.riaz.dev` |
| `NEXT_PUBLIC_SENTRY_DSN` | Staging Sentry project DSN (separate) |
| `NODE_ENV` | `production` (Vercel preview) |
| `LOG_LEVEL` | `debug` |

### 3.3 Development (Local)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Local PostgreSQL or Supabase dev project |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `R2_BUCKET` | `personal-brand-os-dev` (or local mock) |
| `R2_PUBLIC_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional — can use dev DSN or empty |
| `NODE_ENV` | `development` |
| `LOG_LEVEL` | `debug` |

---

## 4. Secrets Management

| Practice | Rule |
|----------|------|
| Storage | Vercel Environment Variables dashboard (Production, Preview, Development) |
| Git | `.env.example` contains dummy values; `.env.local` in `.gitignore` |
| Rotation | Rotate secrets every 90 days or on team member offboarding |
| Access | Only Super Admin has access to production env vars |
| CI | GitHub Actions secrets mirror Vercel env vars for build steps |

---

## 5. `.env.example` Template

```env
# ─── Database ──────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/personal_brand_os
DATABASE_POOL_URL=postgresql://user:pass@localhost:5432/personal_brand_os

# ─── Authentication ────────────────────────────────────
BETTER_AUTH_SECRET=your-secret-here-min-64-chars
BETTER_AUTH_URL=http://localhost:3000

# ─── Storage (Cloudflare R2) ───────────────────────────
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=r2-access-key
R2_SECRET_ACCESS_KEY=r2-secret-key
R2_BUCKET=personal-brand-os-dev
R2_PUBLIC_URL=http://localhost:3000

# ─── Email (Resend) ────────────────────────────────────
RESEND_API_KEY=re_example
RESEND_FROM_EMAIL=noreply@example.com
RESEND_FROM_NAME=Mahmudul Hasan Riaz

# ─── Monitoring (Sentry) ───────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://example@example.ingest.sentry.io/project
SENTRY_AUTH_TOKEN=
SENTRY_ORG=personal-brand-os
SENTRY_PROJECT=personal-brand-os

# ─── Analytics ─────────────────────────────────────────
NEXT_PUBLIC_CLARITY_ID=
NEXT_PUBLIC_UMAMI_URL=
NEXT_PUBLIC_UMAMI_SITE_ID=

# ─── Notifications ─────────────────────────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=

# ─── Cron ──────────────────────────────────────────────
CRON_SECRET=your-cron-secret-min-64-chars

# ─── Application ───────────────────────────────────────
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Mahmudul Hasan Riaz
NEXT_PUBLIC_SITE_DESCRIPTION=Software Engineer, Entrepreneur, Islamic Artist
LOG_LEVEL=debug
```

---

## 6. Variable Validation

At application startup, validate that all required variables are present:

```typescript
// packages/shared/src/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(64),
  BETTER_AUTH_URL: z.string().url(),
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith('re_'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  CRON_SECRET: z.string().min(64),
  NEXT_PUBLIC_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

---

## 7. Total Variable Count

| Category | Required | Optional | Total |
|----------|----------|----------|-------|
| Database | 2 | 0 | 2 |
| Auth | 2 | 0 | 2 |
| Storage | 5 | 0 | 5 |
| Email | 3 | 0 | 3 |
| Monitoring | 1 | 3 | 4 |
| Analytics | 1 | 3 | 4 |
| Notifications | 2 | 2 | 4 |
| Cron | 1 | 0 | 1 |
| Application | 3 | 1 | 4 |
| **Total** | **20** | **9** | **29** |
