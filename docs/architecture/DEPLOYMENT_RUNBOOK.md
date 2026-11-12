# Deployment Runbook

> **PRD Reference:** [PRD.md](../PRD.md) — Deployment Architecture, CI/CD, Rollback Strategy  
> **Status:** Approved  
> **Version:** 1.0

---

## 1. Deployment Overview

| Property | Value |
|----------|-------|
| Platform | Vercel |
| CI/CD | GitHub Actions |
| Database Migrations | Drizzle Kit (CI-applied) |
| Environments | Production, Staging, Development |
| Rollback | Vercel instant rollback + database migration rollback |

---

## 2. Environment Details

### 2.1 Production

| Property | Value |
|----------|-------|
| URL | `https://riaz.dev` (production domain) |
| Vercel Project | `personal-brand-os-prod` |
| Deploy Trigger | Push to `main` |
| Database | Supabase PostgreSQL (production project) |
| R2 Bucket | `personal-brand-os-prod` |
| Monitoring | Sentry (production DSN) |

### 2.2 Staging

| Property | Value |
|----------|-------|
| URL | `https://staging.riaz.dev` |
| Vercel Project | `personal-brand-os-staging` |
| Deploy Trigger | Push to `develop` |
| Database | Supabase PostgreSQL (staging project) |
| R2 Bucket | `personal-brand-os-staging` |
| Monitoring | Sentry (staging DSN, lower sample rate) |

### 2.3 Development (Local)

| Property | Value |
|----------|-------|
| URL | `http://localhost:3000` |
| Database | Local PostgreSQL or Supabase (dev project) |
| R2 Bucket | Local simulation or dev bucket |

---

## 3. Deployment Pipeline

### 3.1 Automatic Deploy (push to main/develop)

```
Git Push (main/develop)
       │
       ▼
GitHub Actions Trigger
       │
       ├── Validation Stage ──────────────────┐
       │   ├── pnpm install                   │
       │   ├── pnpm lint                      │
       │   ├── pnpm typecheck                 │
       │   └── pnpm build                     │
       │                                      │
       ├── Test Stage ────────────────────────┤
       │   ├── pnpm test -- --run             │
       │   └── pnpm test:e2e (staging only)   │
       │                                      │
       ├── Database Migration ────────────────┤
       │   └── pnpm db:migrate                │
       │                                      │
       ├── Deploy Stage ──────────────────────┤
       │   └── vercel deploy --prod           │
       │                                      │
       └── Verification Stage ────────────────┤
           ├── HTTP 200 check on /            │
           ├── HTTP 200 check on /api/health  │
           └── Sentry release tag             │
```

### 3.2 Manual Deploy Steps

If automatic deploy fails:

```bash
# 1. Ensure main branch is clean
git checkout main
git pull origin main

# 2. Run validation locally
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test

# 3. Deploy to Vercel
vercel --prod

# 4. Apply database migrations (if pending)
pnpm --filter database db:migrate

# 5. Verify deployment
curl -I https://riaz.dev
curl -I https://riaz.dev/api/health
```

---

## 4. Database Migration Process

### 4.1 Standard Migration

```bash
# 1. Generate migration (after schema changes)
pnpm --filter database db:generate

# 2. Review generated migration file
# File: packages/database/drizzle/migrations/{timestamp}.sql

# 3. Apply to development
pnpm --filter database db:migrate

# 4. Commit migration files
git add packages/database/drizzle/migrations/
git commit -m "feat(database): add {description}"

# 5. CI applies to staging/production on deploy
```

### 4.2 Migration Rollback

```bash
# If migration causes issues in production:
# 1. Revert schema to previous state
git revert HEAD --no-commit

# 2. Generate rollback migration
pnpm --filter database db:generate

# 3. Apply rollback
pnpm --filter database db:migrate

# 4. Redeploy previous Vercel deployment
vercel rollback
```

---

## 5. Rollback Procedures

### 5.1 Application Rollback (Vercel)

```bash
# CLI rollback
vercel rollback <deployment-id>

# Or via Vercel Dashboard:
# 1. Navigate to Vercel Dashboard → Deployments
# 2. Find the last known-good deployment
# 3. Click "..." → "Promote to Production"
```

### 5.2 Full Rollback (App + Database)

| Step | Action | Command |
|------|--------|---------|
| 1 | Roll back Vercel deployment | `vercel rollback <stable-deploy-id>` |
| 2 | Revert database migration | Applied via Drizzle rollback migration |
| 3 | Verify | Check HTTP 200, run smoke tests |
| 4 | Communicate | Notify team via Slack |

---

## 6. Monitoring & Verification

### 6.1 Post-Deployment Checks

| Check | Endpoint | Expected | Tool |
|-------|----------|----------|------|
| Homepage | `GET /` | 200, HTML | curl/Playwright |
| API Health | `GET /api/health` | 200, JSON | curl |
| Sitemap | `GET /sitemap.xml` | 200, XML | curl |
| Dashboard Login | `GET /dashboard` | 200 (redirect to login) | Playwright |
| Critical Content | `GET /services`, `GET /projects` | 200, content visible | Playwright |

### 6.2 Monitoring Dashboard

After deployment, verify in:
- **Vercel Dashboard:** Build status, deployment logs
- **Sentry:** Error rate, performance issues
- **Cloudflare Analytics:** Traffic spike or drop
- **Better Stack/UptimeRobot:** Uptime status

### 6.3 Deployment Notifications

- Slack channel: `#deployments`
- Notification content: `{environment}: v{version} deployed by {user} — {commit message}`
- On failure: `{environment}: DEPLOY FAILED — {error summary}`

---

## 7. Environment Variables

### 7.1 Management

| Practice | Rule |
|----------|------|
| Storage | Vercel Environment Variables dashboard |
| Secrets | Never committed to git |
| Template | `.env.example` committed with placeholder values |
| Scope | Production/Preview/Development scoped correctly |

### 7.2 Variable Groups

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_URL=postgresql://...  # Supabase pooler

# Auth
BETTER_AUTH_SECRET=<random-64-char-string>
BETTER_AUTH_URL=https://riaz.dev

# Storage
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY=<access-key>
R2_SECRET_KEY=<secret-key>
R2_BUCKET=personal-brand-os-prod

# Email
RESEND_API_KEY=re_...

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_CLARITY_ID=<id>

# Notifications
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_CHAT_ID=<chat-id>
WHATSAPP_API_KEY=<key>

# App
NEXT_PUBLIC_URL=https://riaz.dev
NEXT_PUBLIC_SITE_NAME=Mahmudul Hasan Riaz
```

---

## 8. Scheduled Job Management

### 8.1 Cloudflare Cron Triggers

| Job | Endpoint | Method | Auth | Schedule |
|-----|----------|--------|------|----------|
| Content Scheduler | `/api/cron/schedule` | POST | CRON_SECRET | Every minute |
| Content Expirer | `/api/cron/expire` | POST | CRON_SECRET | Every minute |
| Search Index | `/api/cron/reindex` | POST | CRON_SECRET | Every 5 minutes |
| Newsletter Dispatch | `/api/cron/newsletter` | POST | CRON_SECRET | Every minute |
| Media Cleanup | `/api/cron/media-cleanup` | POST | CRON_SECRET | Daily 03:00 UTC |

### 8.2 Cron Auth

All cron endpoints require a `CRON_SECRET` header matching the environment variable.
Requests without valid secret return 401.

### 8.3 Manual Job Trigger

```bash
# Via dashboard button
curl -X POST https://riaz.dev/api/cron/newsletter \
  -H "Authorization: Bearer $CRON_SECRET"

# Via Vercel CLI
vercel cron trigger newsletter-dispatcher
```

---

## 9. Incident Response

### 9.1 Severity Levels

| Level | Definition | Response Time | Example |
|-------|------------|---------------|---------|
| P0 | Complete outage | 15 min | Site down, DB unreachable |
| P1 | Major feature broken | 1 hour | Login broken, forms not submitting |
| P2 | Minor feature broken | 4 hours | Blog search broken, wrong analytics |
| P3 | Cosmetic issue | 24 hours | Styling glitch on mobile |

### 9.2 Response Steps (P0/P1)

1. **Detect:** Alert from Sentry, uptime monitor, or user report
2. **Assess:** Check Vercel dashboard, Sentry, database status
3. **Mitigate:** Rollback deployment if recent deploy caused issue
4. **Communicate:** Post in `#incidents` channel with status
5. **Fix:** Root cause analysis, fix in feature branch
6. **Deploy:** Via normal CI pipeline
7. **Postmortem:** Within 48 hours

### 9.3 Escalation

| Role | Contact |
|------|---------|
| Primary DevOps | Platform owner |
| Database | Supabase support (Pro plan) |
| Infrastructure | Vercel support (Pro plan) |

---

## 10. Capacity & Scaling

### 10.1 Known Limits

| Resource | Production Limit | Monitoring Threshold |
|----------|-----------------|---------------------|
| Vercel Serverless Execution | 5000 hours/mo (Pro) | Alert at 70% usage |
| Database Connections | 15 direct + 200 pooled (Supabase Pro) | Alert at 150 active |
| R2 Storage | Pay-as-you-go | Alert at $50/mo |
| CDN Bandwidth | 1TB (Cloudflare Pro) | Alert at 800GB |

### 10.2 Scaling Actions

| Threshold | Action |
|-----------|--------|
| Vercel compute > 70% | Evaluate Enterprise plan |
| DB CPU > 80% sustained | Optimize queries, add indexes, scale up |
| R2 storage > $100/mo | Review cleanup strategy, archive old data |
| Monthly cost > $200 | Begin migration to self-hosted infrastructure |

---

## 11. Maintenance Windows

| Activity | Frequency | Expected Downtime | Window |
|----------|-----------|-------------------|--------|
| Database maintenance | As needed | 0 (Supabase handles) | Any |
| R2 maintenance | As needed | 0 (Cloudflare handles) | Any |
| Vercel platform updates | Automatic | 0 | Any |
| Dependency updates | Weekly | 0 (CI builds) | Off-peak |
| Infrastructure migration | Once | 1-2 hours | Scheduled weekend |
