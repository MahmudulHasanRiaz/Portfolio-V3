# Infrastructure

> **PRD Reference:** [PRD.md](../PRD.md) — Infrastructure Architecture (§ Infrastructure Architecture), Deployment Architecture, Performance Architecture  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Infrastructure Overview

```
                         ┌─────────────────┐
                         │   Cloudflare     │
                         │   DNS + CDN      │
                         └────────┬────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                          Vercel Platform                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ apps/web     │  │ apps/dash    │  │ apps/portal  │           │
│  │ (Public)     │  │ (Admin)      │  │ (Client)     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                     │
│         └─────────────────┼─────────────────┘                     │
│                           │                                       │
│                    ┌──────┴──────┐                                │
│                    │  Env Vars   │                                │
│                    └──────┬──────┘                                │
└───────────────────────────┼───────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────────┐
           │                │                     │
  ┌────────┴──────┐ ┌──────┴──────┐  ┌───────────┴──────────┐
  │   Supabase    │ │ Cloudflare  │  │  External Services   │
  │  PostgreSQL   │ │    R2       │  │  Resend, Sentry,     │
  └───────────────┘ └─────────────┘  │  Telegram, WhatsApp  │
                                     └──────────────────────┘
```

---

## 2. Component Specifications

### 2.1 Vercel (Hosting)

| Property | Specification |
|----------|---------------|
| Plan | Pro (production) |
| Framework | Next.js 16 |
| Regions | IAD1 (us-east-1), or nearest to target audience |
| Build | `turbo run build` |
| Output | Serverless Functions + Static Assets |
| Preview Deployments | Enabled per branch |
| Domains | `riaz.dev` (or configured domain), `*.vercel.app` for previews |

### 2.2 Cloudflare (CDN + DNS + Storage + Jobs)

| Service | Usage | Configuration |
|---------|-------|---------------|
| DNS | Domain management | A/AAAA/CNAME records pointed to Vercel |
| CDN | Static asset delivery | Cache rules: images (1y), JS/CSS (1y with hash), HTML (60s SWR) |
| R2 | File storage | Private bucket + public CDN URLs |
| Cron Triggers | Background jobs | 1-min interval for scheduler, daily for cleanup |
| Workers | Auth middleware (optional) | Future consideration |

### 2.3 Supabase PostgreSQL (Database)

| Property | Specification |
|----------|---------------|
| Plan | Pro (production) |
| Region | Aligned with Vercel deployment |
| Connection | Direct via Drizzle ORM (not Supabase JS client) |
| Backups | Daily automated, 7-day retention |
| Connection Pool | Supabase internal pooler (PgBouncer) |

---

## 3. CI/CD Pipeline (GitHub Actions)

### 3.1 Pipeline Architecture

```
Push to branch → Lint → Type Check → Build → Test → Deploy
                    ↑
              All branches (PR validation)

Deploy stages:
  main → Production Vercel
  develop → Preview Vercel (staging)
  feature/* → Preview Vercel (ephemeral)
```

### 3.2 Workflow: PR Validation

```yaml
name: PR Validation
on: pull_request

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
```

### 3.3 Workflow: Production Deploy

| Step | Action |
|------|--------|
| Trigger | Push to `main` |
| Validation | Lint → TypeCheck → Build → Test |
| Deploy | `vercel deploy --prod` |
| Verification | Smoke test (HTTP 200 check on critical routes) |
| Notify | Sentry release tracking, Slack notification |

### 3.4 Environment Variables

| Group | Variables | Source |
|-------|-----------|--------|
| Database | `DATABASE_URL`, `DATABASE_POOL_URL` | Supabase project settings |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Generated |
| R2 | `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET` | Cloudflare dashboard |
| Email | `RESEND_API_KEY` | Resend dashboard |
| Monitoring | `SENTRY_DSN`, `CLARITY_ID`, `UMAMI_URL` | Sentry/Clarity/Umami |
| Notifications | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WHATSAPP_API_KEY` | Bot/API provider |
| App | `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_SITE_NAME` | Environment config |

---

## 4. Environment Strategy

| Environment | Domain | Purpose | Deploy Trigger |
|-------------|--------|---------|----------------|
| Production | `riaz.dev` | Live site | Push to `main` |
| Staging | `staging.riaz.dev` | Pre-release validation | Push to `develop` |
| Development | `localhost:3000` | Local development | Manual |

### Environment Parity
All environments use the same:
- Build process (`turbo run build`)
- Runtime configuration (env vars differ per env)
- Database schema (migrations applied consistently)
- Feature flags (toggle-based, not branch-based)

---

## 5. Monitoring & Observability

### 5.1 Sentry (Error Tracking)

| Configuration | Value |
|---------------|-------|
| DSN | Per-environment |
| Release Tracking | Auto-tagged via CI |
| Performance Tracing | Enabled (sampling: 0.1 in prod) |
| Session Replay | Disabled (privacy) |
| Alert Rules | Errors > 10/min in prod, critical routes only |

### 5.2 Analytics Stack

| Tool | Purpose | Implementation |
|------|---------|----------------|
| Cloudflare Analytics | Core traffic metrics | Edge-level, no JS |
| Microsoft Clarity | Session recordings, heatmaps | Script tag, deferred load |
| Umami | Privacy-focused analytics | Self-hosted, script tag |

### 5.3 Uptime Monitoring

External monitoring (e.g., Better Stack, UptimeRobot) configured for:
- HTTP 200 on `/`
- HTTP 200 on `/api/health`
- SSL certificate expiry
- Response time > 5s alert

---

## 6. Background Job Infrastructure

### 6.1 Scheduling Runtime

| Property | Value |
|----------|-------|
| Platform | Cloudflare Cron Triggers |
| Interval | Every 1 minute |
| Timeout | 30 seconds per execution |
| Retry | 3 attempts on failure |
| Handler | Edge function or external webhook |

### 6.2 Job Registry

| Job | Schedule | Endpoint | Timeout | Critical |
|-----|----------|----------|---------|----------|
| Content Scheduler | Every 1 min | `POST /api/cron/schedule` | 30s | Yes |
| Content Expirer | Every 1 min | `POST /api/cron/expire` | 30s | Yes |
| Search Indexer | Every 5 min | `POST /api/cron/reindex` | 60s | No |
| Newsletter Dispatcher | Every 1 min | `POST /api/cron/newsletter` | 60s | Yes |
| Media Cleanup | Daily 03:00 UTC | `POST /api/cron/media-cleanup` | 120s | No |
| Notification Retry | Every 5 min | `POST /api/cron/retry-notifications` | 30s | No |

### 6.3 Newsletter Dispatcher Detail

**Purpose:** Send scheduled newsletter campaigns via Resend.

**Flow:**
1. Cron triggers `POST /api/cron/newsletter`
2. Query `campaigns` WHERE `status = 'scheduled'` AND `scheduled_at <= NOW()`
3. Update campaign status to `sending`
4. Fetch subscribers matching campaign segments
5. Batch send via Resend API (max 50/batch)
6. Track sends in campaign_analytics
7. Mark campaign `sent` when all emails dispatched
8. On failure: retry individual emails up to 3 times, then log failed

**Edge Cases:**
- Empty campaign segments → mark as error immediately
- All subscribers bounced → mark campaign as completed with 0 delivered
- Resend rate limit → exponential backoff, resume in next cron cycle

### 6.4 Media Cleanup Detail

**Purpose:** Remove orphaned media assets from R2 and database.

**Flow:**
1. Cron triggers `POST /api/cron/media-cleanup` daily at 03:00 UTC
2. Query `media_assets` WHERE `deleted_at IS NULL`
3. For each asset, check all content table JSON/image fields for reference
4. Unreferenced assets → `deleted_at = NOW()` + move file to `r2://.trash/YYYY-MM-DD/`
5. Trash files older than 30 days → permanent delete from R2
6. Log orphan count, storage freed, errors to Sentry

**Orphan Detection Exclusions:**
- Assets in `.trash/` folder (already handled)
- Assets uploaded in last 24 hours (grace period)
- Assets with `keep_forever` flag (if implemented)

---

## 7. Backup Strategy

| Data | Method | Frequency | Retention | Location |
|------|--------|-----------|-----------|----------|
| PostgreSQL | Automated (Supabase) | Daily | 7 days | Supabase |
| Media (R2) | Cross-region replication | Continuous | — | Cloudflare R2 |
| Configuration | Git (environment files template) | Per change | Full history | GitHub |

---

## 8. Scalability Limits

| Resource | Current Capacity | Scaling Method |
|----------|-----------------|----------------|
| PostgreSQL | Supabase Pro (8GB RAM, 2 vCPU) | Upgrade plan or self-host |
| Vercel | Pro plan (1000GB bandwidth, 5000h serverless) | Enterprise plan |
| R2 | 10GB free, pay-as-you-go | Automatic |
| CDN | Cloudflare Global Network | Automatic |
| Cron Jobs | 5 triggers (free tier) | Workers Paid plan |

---

## 9. Cost Estimate (Production Monthly)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Vercel Pro | $20 | +$20/extra team member |
| Supabase Pro | $25 | +$0.30/GB beyond 8GB |
| Cloudflare | $20 | Pro plan (R2 + CDN + Cron) |
| Resend | $0 | 100 free emails/day |
| Sentry | $0 | Developer plan |
| Domains | $10-15/yr | Per domain |
| **Total** | **~$70-80/mo** | |

---

## 10. Future Migration Targets

| Component | Current | Future | Trigger |
|-----------|---------|--------|---------|
| Database | Supabase PostgreSQL | Self-hosted PostgreSQL | Cost > $200/mo |
| Hosting | Vercel | VPS (Docker) | Cost > $200/mo or scaling limits |
| Email | Resend | Sendy (self-hosted) | Email volume > 10k/mo |
| Search | PostgreSQL FTS | Meilisearch | Performance degradation |
| Analytics | Cloudflare + Clarity + Umami | PostHog | Need advanced analytics |
