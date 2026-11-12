# Background Jobs

> **PRD Reference:** [PRD.md](../PRD.md) — Scheduling Runtime, Newsletter System, Media Architecture  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Job Infrastructure

| Property | Specification |
|----------|---------------|
| Platform | Cloudflare Cron Triggers |
| Execution | Vercel Serverless Functions (via HTTP endpoint) |
| Schedule Definition | Cloudflare Dashboard cron expressions |
| Auth | `CRON_SECRET` header — validated on every endpoint |
| Concurrency Prevention | PostgreSQL advisory lock (`pg_try_advisory_lock`) |
| Timeout | 30 seconds per execution (Vercel Hobby: 10s, Pro: 60s) |
| Retry | Configurable per job (max 3 attempts) |
| Monitoring | Sentry Cron Monitors + job-level metrics |
| Logging | Structured JSON (job start, progress, complete, failure) |

---

## 2. Security Model

### 2.1 Request Flow

```
Cloudflare Cron Trigger
         │
         ▼
  Signed HTTP Request
  (POST + Authorization header)
         │
         ▼
  Vercel Serverless Endpoint
  (/api/cron/{job})
         │
         ▼
  CRON_SECRET Validation
  ───────────────────────
  Header: Authorization: Bearer {CRON_SECRET}
  ├── Match → Continue to job execution
  └── No match → Return 401 Unauthorized
         │
         ▼
  Job Execution
  (with advisory lock + Sentry monitoring)
```

### 2.2 CRON_SECRET Specification

| Property | Value |
|----------|-------|
| Environment Variable | `CRON_SECRET` |
| Min Length | 64 characters |
| Character Set | Alphanumeric + special chars |
| Generation | `openssl rand -base64 48` or equivalent |
| Storage | Vercel Environment Variables (Production, Preview, Development) |
| Rotation | Every 90 days or on security incident |
| Per-Environment | Unique per environment (prod, staging, dev) |

### 2.3 Validation Implementation

```typescript
// packages/shared/src/cron-auth.ts
import { env } from './env';

export function validateCronRequest(request: Request): void {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    throw new CronUnauthorizedError('Invalid or missing CRON_SECRET');
  }
}

export class CronUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronUnauthorizedError';
  }
}
```

### 2.4 Endpoint Protection Pattern

Every cron endpoint applies the same protection:

```typescript
export async function POST(request: Request) {
  try {
    validateCronRequest(request);
  } catch (error) {
    logger.warn({
      message: 'unauthorized_cron_attempt',
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  return withJobLock('content-scheduler', async () => {
    // job execution
  });
}
```

### 2.5 Security Event Logging

| Event | Log Level | Data Captured |
|-------|-----------|---------------|
| Valid CRON_SECRET | debug | Job ID, execution start time |
| Invalid CRON_SECRET | warn | IP address, user-agent, attempted endpoint |
| Missing Authorization header | warn | IP address, endpoint |
| Expired/missing CRON_SECRET env var | error | Job ID, startup time |

All unauthorized requests are logged to both the application logger and `audit_logs` table for security audit trail.

### 2.6 Failure Handling for Auth Failures

| Scenario | Response | Action |
|----------|----------|--------|
| Missing `CRON_SECRET` env var | 500 Internal Server Error | Captured as Sentry critical error on app startup |
| Missing Authorization header | 401 Unauthorized | Logged as warning |
| Invalid CRON_SECRET value | 401 Unauthorized | Logged as warning with IP |
| Expired CRON_SECRET (after rotation) | 401 Unauthorized | Job missed until env var updated |

---

## 3. Job Registry

| # | Job | ID | Schedule | Critical | Timeout |
|---|-----|----|----------|----------|---------|
| 1 | Content Scheduler | `content-scheduler` | `* * * * *` | Yes | 30s |
| 2 | Content Expirer | `content-expirer` | `* * * * *` | Yes | 30s |
| 3 | Newsletter Dispatcher | `newsletter-dispatcher` | `* * * * *` | Yes | 60s |
| 4 | Search Indexer | `search-indexer` | `*/5 * * * *` | No | 60s |
| 5 | Media Cleanup | `media-cleanup` | `0 3 * * *` | No | 120s |
| 6 | Notification Retry | `notification-retry` | `*/5 * * * *` | No | 30s |
| 7 | Invoice Reminder | `invoice-reminder` | `0 9 * * *` | No | 30s |

---

## 4. Job Specifications

### 4.1 Content Scheduler

| Property | Value |
|----------|-------|
| Job ID | `content-scheduler` |
| Endpoint | `POST /api/cron/schedule` |
| Cron | `* * * * *` (every 1 minute) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `content-scheduler` (every 1 min) |

**Input (query):**
```sql
SELECT id, entity_type, publish_at
FROM content_schedule_queue
WHERE status = 'scheduled'
  AND publish_at <= NOW()
  AND processed_at IS NULL
LIMIT 50;
```

**Processing:**
```
For each row:
  1. Update content entity status → 'published'
  2. Set processed_at = NOW()
  3. Revalidate content path (revalidateTag)
  4. Log to audit_logs
```

**Output:** Number of items published, list of entity IDs.

**Failure Handling:**
| Scenario | Action |
|----------|--------|
| DB error | Retry entire batch in next cycle |
| Revalidation failure | Log warning, continue (cache will expire naturally) |
| Entity not found (deleted between detection and action) | Log info, mark as processed |
| Concurrent execution | Advisory lock prevents overlap |

**Monitoring:**
- Sentry Cron Monitor: tracks execution start and completion
- Log metric: `cron.content_scheduler.published_count`
- Log metric: `cron.content_scheduler.duration_ms`
- Alert: 0 items processed for 10 consecutive runs

**Logging:**
```json
{
  "level": "info",
  "job": "content-scheduler",
  "published": 3,
  "duration": 1234,
  "entities": ["post:abc123", "project:def456"]
}
```

---

### 4.2 Content Expirer

| Property | Value |
|----------|-------|
| Job ID | `content-expirer` |
| Endpoint | `POST /api/cron/expire` |
| Cron | `* * * * *` (every 1 minute) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `content-expirer` (every 1 min) |

**Input (query):**
```sql
SELECT id, entity_type, expires_at
FROM content_expire_queue
WHERE expires_at <= NOW()
  AND status = 'published'
LIMIT 50;
```

**Processing:**
```
For each row:
  1. Update content entity status → 'expired'
  2. Revalidate content path
  3. Log to audit_logs
```

**Output:** Number of items expired, list of entity IDs.

**Failure Handling:** Matches Content Scheduler pattern.

---

### 4.3 Newsletter Dispatcher

| Property | Value |
|----------|-------|
| Job ID | `newsletter-dispatcher` |
| Endpoint | `POST /api/cron/newsletter` |
| Cron | `* * * * *` (every 1 minute) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `newsletter-dispatcher` (every 1 min) |

**Input (query):**
```sql
SELECT * FROM campaigns
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 5;
```

**Processing:**
```
For each campaign:
  1. Update campaign status → 'sending'
  2. Fetch subscribers matching campaign segments
     WHERE status = 'active'
  3. Batch emails via Resend (max 50/batch)
  4. Track results: sent_count, bounce_count
  5. After all batches:
     - Update campaign status → 'sent'
     - Set sent_at = NOW()
```

**Output:** `{ campaignId, totalSubscribers, sent, bounced, failed }`

**Failure Handling:**
| Scenario | Action |
|----------|--------|
| Resend API rate limit (429) | Backoff 60s, resume next batch |
| Resend API down (5xx) | Retry 3x with exponential backoff (1s, 2s, 4s); if still failing, mark campaign as `failed` |
| Individual email hard bounce | Mark subscriber as `bounced`, skip, continue |
| Invalid email format in subscriber list | Skip, log to campaign errors |
| Campaign segment empty (0 subscribers) | Mark campaign as `completed` with 0 sent |
| Campaign deleted mid-send | Log warning, abort campaign |

**Resend API Integration:**
```typescript
async function sendCampaignBatch(emails: Email[]): Promise<BatchResult> {
  const batch = emails.map(email => ({
    from: process.env.RESEND_FROM_EMAIL,
    to: [email.address],
    subject: email.subject,
    html: email.htmlContent,
    tags: [{ name: 'campaign_id', value: email.campaignId }],
  }));

  const results = await withRetry(
    () => Promise.allSettled(batch.map(e => resend.emails.send(e))),
    { maxRetries: 3, baseDelay: 1000 }
  );

  return {
    sent: results.filter(r => r.status === 'fulfilled' && r.value.error === null).length,
    bounced: results.filter(r => r.status === 'fulfilled' && r.value.error?.name === 'bounced').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}
```

**Monitoring:**
- Sentry Cron Monitor: tracks execution
- Campaign metrics stored in campaign record
- Alert: campaign stuck in `sending` status for > 1 hour

---

### 4.4 Search Indexer

| Property | Value |
|----------|-------|
| Job ID | `search-indexer` |
| Endpoint | `POST /api/cron/reindex` |
| Cron | `*/5 * * * *` (every 5 minutes) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `search-indexer` (every 5 min) |

**Input:** None — full diff-based sync.

**Processing:**
```
For each content type (posts, projects, services, etc.):
  1. Query all published entities updated since last index time
  2. Upsert into search_index table
  3. Remove deleted entities from search_index
```

**Query pattern:**
```sql
-- Upsert new/updated
INSERT INTO search_index (entity_type, entity_id, title, content, summary, url, published_at, tsvector)
VALUES ($1, $2, $3, $4, $5, $6, $7, to_tsvector('english', $3 || ' ' || $4))
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  tsvector = EXCLUDED.tsvector,
  updated_at = NOW();

-- Remove deleted
DELETE FROM search_index
WHERE (entity_type, entity_id) NOT IN (
  SELECT 'post', id FROM posts WHERE status = 'published'
  UNION ALL
  SELECT 'project', id FROM projects WHERE status = 'published'
  -- ... all other content types
);
```

**Output:** `{ typesIndexed: 8, upserted: 23, removed: 2, duration: 3456 }`

**Failure Handling:** Non-critical — index will sync in next cycle.

---

### 4.5 Media Cleanup

| Property | Value |
|----------|-------|
| Job ID | `media-cleanup` |
| Endpoint | `POST /api/cron/media-cleanup` |
| Cron | `0 3 * * *` (daily at 03:00 UTC) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `media-cleanup` (daily) |

**Input (query):**
```sql
SELECT * FROM media_assets
WHERE deleted_at IS NULL
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;
```

**Processing:**
```
For each media asset:
  1. Check all content tables for references:
     - posts.content (Tiptap JSON → extract image URLs)
     - projects.thumbnail, projects.cover_image
     - services thumbnail
     - releases cover_image
     - person_profiles.profile_image, cover_image
     - pages.content
     - All rich text fields containing image URLs
  2. If no references found → mark as orphan
  3. Move file: r2://{path} → r2://.trash/{YYYY-MM-DD}/{filename}
  4. Set media_assets.deleted_at = NOW()
  5. Log to audit_logs
```

**Orphan detection strategy:**
```typescript
async function isOrphaned(asset: MediaAsset): Promise<boolean> {
  const urlPattern = `%${asset.path}%`;
  const checks = await Promise.all([
    checkReference('posts', 'content', urlPattern),
    checkReference('projects', 'thumbnail', asset.path),
    checkReference('projects', 'cover_image', asset.path),
    checkReference('services', 'thumbnail', asset.path),
    checkReference('releases', 'cover_image', asset.path),
    checkReference('person_profiles', 'profile_image', asset.path),
    checkReference('person_profiles', 'cover_image', asset.path),
    checkReference('pages', 'content', urlPattern),
    checkReference('case_studies', 'content', urlPattern),
    checkReference('resources', 'content', urlPattern),
  ]);
  return checks.every(c => c === false);
}
```

**Output:** `{ assetsScanned: 1200, orphansFound: 34, trashMoved: 34, storageFreed: 256000000, duration: 45000 }`

**Failure Handling:**
| Scenario | Action |
|----------|--------|
| R2 move fails (network) | Log error, skip to next asset, retry next run |
| DB update fails after R2 move | Log critical — inconsistent state (file in trash, DB not updated) |
| Concurrent execution | Advisory lock prevents overlap |
| Asset referenced but R2 file missing | Log warning, mark as broken |

**Monitoring:**
- Daily metric: orphan count
- Daily metric: storage freed (bytes)
- Alert: > 100 orphans found (may indicate broken reference tracking)
- Sentry Cron Monitor: daily execution check

---

### 4.6 Notification Retry

| Property | Value |
|----------|-------|
| Job ID | `notification-retry` |
| Endpoint | `POST /api/cron/retry-notifications` |
| Cron | `*/5 * * * *` (every 5 minutes) |
| Trigger | Cloudflare Cron Trigger |
| Sentry Monitor | `notification-retry` (every 5 min) |

**Input (query):**
```sql
SELECT * FROM notification_queue
WHERE status = 'failed'
  AND retry_count < 3
  AND last_attempt_at < NOW() - INTERVAL '5 minutes'
ORDER BY last_attempt_at ASC
LIMIT 20;
```

**Processing:**
```
For each notification:
  1. Attempt delivery via configured channel (Telegram/WhatsApp/Email)
  2. On success: update status → 'delivered'
  3. On failure: increment retry_count, update last_attempt_at
  4. After 3 failures: update status → 'permanent_failure'
```

**Output:** `{ processed: 15, delivered: 12, permanentFailures: 3 }`

---

### 4.7 Invoice Reminder

| Property | Value |
|----------|-------|
| Job ID | `invoice-reminder` |
| Endpoint | `POST /api/cron/invoice-reminder` |
| Cron | `0 9 * * *` (daily at 09:00 UTC) |
| Trigger | Cloudflare Cron Trigger |

**Input (query):**
```sql
SELECT * FROM finance_invoices
WHERE status = 'sent'
  AND due_date <= NOW()
  AND reminder_sent = false;
```

**Processing:**
```
For each overdue invoice:
  1. Send notification (Telegram + Email)
  2. Mark reminder_sent = true
```

---

## 5. Concurrency Prevention

All cron jobs acquire a PostgreSQL advisory lock before processing:

```typescript
export async function withJobLock(jobId: string, fn: () => Promise<void>) {
  const lockId = hashJobId(jobId); // Deterministic int8 from job name
  const [acquired] = await db.execute(
    sql`SELECT pg_try_advisory_lock(${lockId}) AS acquired`
  );

  if (!acquired) {
    logger.info({ job: jobId, message: 'skipped — another instance running' });
    return;
  }

  try {
    await fn();
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
  }
}
```

---

## 6. Sentry Cron Monitoring Setup

Each job is registered as a Sentry Cron Monitor:

```typescript
import * as Sentry from '@sentry/nextjs';

export async function monitoredJob(jobId: string, fn: () => Promise<void>) {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: jobId,
    status: 'in_progress',
  });

  try {
    await fn();
    Sentry.captureCheckIn({
      monitorSlug: jobId,
      status: 'ok',
      checkInId,
    });
  } catch (error) {
    Sentry.captureCheckIn({
      monitorSlug: jobId,
      status: 'error',
      checkInId,
    });
    throw error;
  }
}
```

Sentry dashboard configuration: expected interval matches cron schedule. Missed check-in sends alert.

---

## 7. Cloudflare Dashboard Cron Registration

| Job | Endpoint | Cron Expression |
|-----|----------|-----------------|
| Content Scheduler | `https://riaz.dev/api/cron/schedule` | `* * * * *` |
| Content Expirer | `https://riaz.dev/api/cron/expire` | `* * * * *` |
| Newsletter Dispatcher | `https://riaz.dev/api/cron/newsletter` | `* * * * *` |
| Search Indexer | `https://riaz.dev/api/cron/reindex` | `*/5 * * * *` |
| Media Cleanup | `https://riaz.dev/api/cron/media-cleanup` | `0 3 * * *` |
| Notification Retry | `https://riaz.dev/api/cron/retry-notifications` | `*/5 * * * *` |
| Invoice Reminder | `https://riaz.dev/api/cron/invoice-reminder` | `0 9 * * *` |

Each trigger sends `POST` with header `Authorization: Bearer {CRON_SECRET}`.

---

## 8. Error Summary

| Job | Retry | Max Duration | Failure State | Recovery |
|-----|-------|-------------|---------------|----------|
| Content Scheduler | Next cycle | 30s | Items skipped | Auto-retry next cycle |
| Content Expirer | Next cycle | 30s | Items skipped | Auto-retry next cycle |
| Newsletter Dispatcher | 3 per email + next cycle | 60s | Campaign stays `sending` | Manual retry from dashboard |
| Search Indexer | Next cycle | 60s | Stale index | Auto-fix next cycle |
| Media Cleanup | Next day | 120s | Orphans remain | Auto-retry next run |
| Notification Retry | 3 attempts | 30s | Permanent failure | Manual re-send from dashboard |
| Invoice Reminder | Next day | 30s | Reminder missed | Auto-retry next run |
