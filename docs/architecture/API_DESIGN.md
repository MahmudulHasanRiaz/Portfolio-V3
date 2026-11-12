# API Design

> **PRD Reference:** [PRD.md](../PRD.md) — API & Integration Architecture (§ API & Integration Architecture)  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. API Architecture

| Property | Specification |
|----------|---------------|
| Pattern | Next.js Route Handlers + Server Actions |
| Excluded | GraphQL, tRPC, separate backend service, microservices |
| Public Website | Server Components first — direct data access via repositories |
| Dashboard | Route Handlers (GET) + Server Actions (POST/PUT/DELETE) |
| Portal | Route Handlers (GET) + Server Actions (POST/PUT) |
| External | REST APIs only |
| Base Path | `/api/*` |

---

## 2. Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Error Codes

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | VALIDATION_ERROR | Zod validation failed |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | No permission |
| 404 | NOT_FOUND | Entity not found |
| 409 | CONFLICT | Duplicate or conflict |
| 422 | UNPROCESSABLE | Business logic failure |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected error |

---

## 3. Content APIs

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List posts (paginated, filtered) |
| GET | `/api/posts/[id]` | Get single post |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/[id]` | Update post |
| DELETE | `/api/posts/[id]` | Delete post |
| PUT | `/api/posts/[id]/status` | Change status (publish/schedule/archive) |

**Query params (GET /api/posts):** `page`, `pageSize`, `status`, `categoryId`, `tagId`, `search`, `sortBy`, `sortOrder`

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/[id]` | Get single project |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List services |
| GET | `/api/services/[id]` | Get service with FAQs |
| POST | `/api/services` | Create service |
| PUT | `/api/services/[id]` | Update service |
| DELETE | `/api/services/[id]` | Delete service |
| PUT | `/api/services/reorder` | Drag-and-drop reorder |

### Releases
| Method | Endpoint |
|--------|----------|
| GET | `/api/releases` |
| GET | `/api/releases/[id]` |
| POST | `/api/releases` |
| PUT | `/api/releases/[id]` |
| DELETE | `/api/releases/[id]` |

### Ventures
| Method | Endpoint |
|--------|----------|
| GET | `/api/ventures` |
| GET | `/api/ventures/[id]` |
| POST | `/api/ventures` |
| PUT | `/api/ventures/[id]` |
| DELETE | `/api/ventures/[id]` |

### Resources
| Method | Endpoint |
|--------|----------|
| GET | `/api/resources` |
| GET | `/api/resources/[id]` |
| POST | `/api/resources` |
| PUT | `/api/resources/[id]` |
| DELETE | `/api/resources/[id]` |

### Case Studies
| Method | Endpoint |
|--------|----------|
| GET | `/api/case-studies` |
| GET | `/api/case-studies/[id]` |
| POST | `/api/case-studies` |
| PUT | `/api/case-studies/[id]` |
| DELETE | `/api/case-studies/[id]` |

---

## 4. CRM APIs

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads (paginated, filtered) |
| GET | `/api/leads/[id]` | Get lead with activities |
| POST | `/api/leads` | Create lead (from form) |
| PUT | `/api/leads/[id]` | Update lead |
| PUT | `/api/leads/[id]/status` | Change pipeline status |
| PUT | `/api/leads/[id]/assign` | Assign to user |
| GET | `/api/leads/[id]/activities` | Get lead timeline |
| POST | `/api/leads/[id]/notes` | Add internal note |
| GET | `/api/leads/follow-up` | Follow-up queue |

**Query params:** `status`, `source`, `assignedTo`, `dateFrom`, `dateTo`, `search`, `page`, `pageSize`

### Forms
| Method | Endpoint |
|--------|----------|
| GET | `/api/forms` |
| GET | `/api/forms/[id]` |
| POST | `/api/forms` |
| PUT | `/api/forms/[id]` |
| DELETE | `/api/forms/[id]` |
| GET | `/api/forms/[id]/submissions` |
| GET | `/api/forms/[id]/analytics` |
| POST | `/api/forms/[slug]/submit` | Public form submission |

---

## 5. Media APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media` | List media assets (paginated) |
| POST | `/api/media/upload` | Upload file → R2 |
| DELETE | `/api/media/[id]` | Soft delete media |
| PUT | `/api/media/[id]` | Update metadata |
| GET | `/api/media/folders` | List folders |
| POST | `/api/media/folders` | Create folder |

---

## 6. Search APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Full-text search |
| POST | `/api/search/index` | Trigger reindex |
| GET | `/api/search/synonyms` | List synonyms |
| POST | `/api/search/synonyms` | Add synonym |

**Query params:** `q` (query), `type` (content type filter), `category`, `tag`, `page`, `pageSize`

---

## 7. Freelance Project APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List freelance projects |
| GET | `/api/projects/[id]` | Project detail |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/[id]` | Update project |
| PUT | `/api/projects/[id]/status` | Change status |
| GET | `/api/projects/[id]/milestones` | List milestones |
| POST | `/api/projects/[id]/milestones` | Create milestone |
| PUT | `/api/projects/[id]/milestones/[mid]` | Update milestone |
| GET | `/api/projects/[id]/deliverables` | List deliverables |
| POST | `/api/projects/[id]/deliverables` | Upload deliverable |
| PUT | `/api/projects/[id]/deliverables/[did]` | Update deliverable |
| GET | `/api/projects/[id]/activity` | Activity log |
| GET | `/api/projects/[id]/payments` | Payment summary |
| GET | `/api/projects/[id]/expenses` | Expense list |

---

## 8. Event APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/events` |
| GET | `/api/events/[id]` |
| POST | `/api/events` |
| PUT | `/api/events/[id]` |
| PUT | `/api/events/[id]/status` |
| GET | `/api/events/[id]/logistics` |
| PUT | `/api/events/[id]/logistics` |
| GET | `/api/events/availability` |
| PUT | `/api/events/availability` |
| POST | `/api/events/[id]/booking` | Public booking submission |

---

## 9. Finance APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/finance/payments` |
| POST | `/api/finance/payments` |
| PUT | `/api/finance/payments/[id]` |
| DELETE | `/api/finance/payments/[id]` |
| GET | `/api/finance/expenses` |
| POST | `/api/finance/expenses` |
| PUT | `/api/finance/expenses/[id]` |
| DELETE | `/api/finance/expenses/[id]` |
| GET | `/api/finance/invoices` |
| POST | `/api/finance/invoices` |
| PUT | `/api/finance/invoices/[id]` |
| GET | `/api/finance/invoices/[id]/pdf` | Download PDF |
| GET | `/api/finance/summary` | Dashboard totals |
| GET | `/api/finance/payment-methods` |
| POST | `/api/finance/payment-methods` |
| PUT | `/api/finance/payment-methods/[id]` |

---

## 10. Portal APIs

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/portal/login` | Token |
| GET | `/api/portal/[token]/project` | Token |
| GET | `/api/portal/[token]/milestones` | Token |
| GET | `/api/portal/[token]/deliverables` | Token |
| PUT | `/api/portal/[token]/deliverables/[did]/approve` | Token |
| PUT | `/api/portal/[token]/deliverables/[did]/revision` | Token |
| GET | `/api/portal/[token]/payments` | Token |
| GET | `/api/portal/[token]/invoices/[id]/download` | Token |
| GET | `/api/portal/[token]/messages` | Token |
| POST | `/api/portal/[token]/messages` | Token |

---

## 11. Proposal APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/proposals/templates` |
| POST | `/api/proposals/templates` |
| PUT | `/api/proposals/templates/[id]` |
| DELETE | `/api/proposals/templates/[id]` |
| POST | `/api/proposals/generate` | Generate from template |
| PUT | `/api/proposals/documents/[id]/status` | Mark sent/accepted |
| GET | `/api/proposals/documents/[id]/pdf` | Download PDF |

---

## 12. SEO APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/seo/redirects` |
| POST | `/api/seo/redirects` |
| DELETE | `/api/seo/redirects/[id]` |
| GET | `/api/seo/sitemap-status` |
| GET | `/api/seo/broken-links` |
| POST | `/api/seo/reindex` | Trigger full sitemap regeneration |

---

## 13. Notification APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/notifications/settings` |
| PUT | `/api/notifications/settings` |
| POST | `/api/notifications/test` | Send test notification |

---

## 14. Newsletter APIs

| Method | Endpoint |
|--------|----------|
| POST | `/api/newsletter/subscribe` | Public subscription |
| POST | `/api/newsletter/verify` | Verify email (token) |
| POST | `/api/newsletter/unsubscribe` | Unsubscribe |
| PUT | `/api/newsletter/preferences` | Update preferences |
| GET | `/api/newsletter/campaigns` | List campaigns |
| POST | `/api/newsletter/campaigns` | Create campaign |
| PUT | `/api/newsletter/campaigns/[id]` | Update campaign |
| POST | `/api/newsletter/campaigns/[id]/send` | Trigger send |
| GET | `/api/newsletter/metrics` | Dashboard metrics |

---

## 15. Validation Layer

### Standard (Zod)
```typescript
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published', 'archived']),
  publishAt: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});
```

### Rule
All APIs require Zod validation. This includes: all content CRUD, form submissions, lead operations, media uploads, finance entries, portal actions, proposal operations, notification settings, newsletter operations, and authentication.

---

## 16. Dependencies

### 16.1 Cron Schedule Recommendations (API-Layer Impact)

| Job | API Endpoint | Auth | Rate Limit (API-side) | Idempotency |
|-----|-------------|------|----------------------|-------------|
| Content Scheduler | `POST /api/cron/schedule` | CRON_SECRET header | 1 req/min (self-throttling) | Yes — skips already-published |
| Content Expirer | `POST /api/cron/expire` | CRON_SECRET header | 1 req/min | Yes — skips already-expired |
| Newsletter Dispatcher | `POST /api/cron/newsletter` | CRON_SECRET header | 1 req/min | Yes — batch tracked via campaign status |
| Media Cleanup | `POST /api/cron/media-cleanup` | CRON_SECRET header | 1 req/day | Yes — skips already-orphaned |
| Search Indexer | `POST /api/cron/reindex` | CRON_SECRET header | 1 req/5min | Yes — upsert-based |
| Notification Retry | `POST /api/cron/retry-notifications` | CRON_SECRET header | 1 req/5min | Yes — skips already-delivered |

All cron endpoints return `202 Accepted` immediately and process asynchronously. Response includes a `jobId` for tracking.

### 16.2 Sentry Integration (API-Layer Impact)

| Aspect | Specification |
|--------|---------------|
| Route Handler Wrapper | Every handler wrapped with `withErrorHandler` that captures errors to Sentry |
| Performance Tracing | Sentry traces for all Route Handlers (0.1 sample rate in prod) |
| Transaction Names | `{method} /api/{resource}` — e.g., `GET /api/posts` |
| Custom Metrics | Response time bucketed: <100ms, <500ms, <1000ms, >1000ms |
| 4xx Tracking | 4xx responses logged as warnings (not errors) — except 401/403 which are info |
| 5xx Tracking | All 5xx captured as errors with full request context |
| Rate Limit Breach | Captured as warning with IP and endpoint |

**Error handler with Sentry:**
```typescript
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now();
    try {
      const response = await handler(req, ctx);
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn({ method: req.method, url: req.url, duration, message: 'slow_api' });
      }
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      Sentry.captureException(error, {
        tags: { method: req.method, url: req.url },
        extra: { duration, params: ctx.params },
      });
      return errorResponse(error);
    }
  };
}
```

### 16.3 Logging Requirements (API-Layer Impact)

| Operation | Log Level | Data Captured |
|-----------|-----------|---------------|
| Incoming request | debug | Method, URL, requestId, user-agent (truncated) |
| Response sent | debug | Method, URL, status, duration, requestId |
| Validation failure | warn | Method, URL, field errors, requestId |
| Authorization failure | info | Method, URL, userId (if authed), required permission |
| Rate limit hit | warn | IP, endpoint, requestId |
| External API call | debug | Service name, method, URL, status, duration |
| 5xx response | error | Full error, request context, duration |

**API logging middleware pattern:**
```typescript
export async function apiLogger(req: NextRequest, ctx: { params: unknown }) {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  logger.info({
    requestId,
    method: req.method,
    url: req.nextUrl.pathname,
    query: Object.fromEntries(req.nextUrl.searchParams),
    message: 'incoming_request',
  });

  // (response handled in withErrorHandler or equivalent)
}
```

---

## 17. Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Form Submissions | 3 per IP | 60 seconds |
| Newsletter Subscribe | 1 per IP | 60 seconds |
| Public Search | 30 requests | 60 seconds |
| Media Upload | 10 requests | 60 seconds |
| All API Requests | 100 requests | 60 seconds |
