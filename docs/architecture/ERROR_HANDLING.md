# Error Handling Strategy

> **PRD Reference:** [PRD.md](../PRD.md) — Security (§ Input Validation), API Design (§ Response Format), Performance  
> **Status:** Approved  
> **Version:** 1.0

---

## 1. Error Handling Philosophy

| Principle | Practice |
|-----------|----------|
| Fail Fast | Validate at the boundary, reject early |
| Never Leak Internals | No stack traces in production responses |
| Always Informative | Errors include actionable messages |
| Never Silent | Every error is logged (appropriate severity) |
| Graceful Degradation | Fallback behavior for external service failures |

---

## 2. Error Classification

| Class | HTTP Status | Severity | Example |
|-------|-------------|----------|---------|
| Validation | 400/422 | Low | Invalid email format |
| Authentication | 401 | Medium | Expired session |
| Authorization | 403 | High | Insufficient permissions |
| Not Found | 404 | Low | Entity does not exist |
| Conflict | 409 | Medium | Duplicate slug |
| Rate Limit | 429 | Low | Too many requests |
| External Service | 502/503 | Critical | Resend API down |
| Internal | 500 | Critical | Unexpected null pointer |

---

## 3. Application Error Hierarchy

```typescript
// Base app error
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Concrete errors
class ValidationError extends AppError {
  constructor(errors: ValidationErrorItem[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400, { errors });
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Authentication required', 'UNAUTHORIZED', 401);
  }
}

class ForbiddenError extends AppError {
  constructor() {
    super('Insufficient permissions', 'FORBIDDEN', 403);
  }
}

class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 'RATE_LIMITED', 429, { retryAfter });
  }
}

class ExternalServiceError extends AppError {
  constructor(service: string, cause: Error) {
    super(`${service} unavailable`, 'EXTERNAL_ERROR', 502, { service });
    this.cause = cause;
  }
}
```

---

## 4. API Error Response Format

```typescript
// Shape
interface ErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  requestId?: string;
}

// Example: Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Minimum 8 characters required" }
  ],
  "requestId": "req_abc123"
}

// Example: Internal Error (production)
{
  "success": false,
  "message": "An unexpected error occurred",
  "requestId": "req_def456"
}
```

---

## 5. Error Handling Layers

### 5.1 Global Error Boundary (React)

```typescript
// One level above page content — catches render errors
function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="flex flex-col items-center justify-center p-12">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-secondary">Please try refreshing the page</p>
          <Button onClick={reset}>Try Again</Button>
        </div>
      )}
      onError={(error) => Sentry.captureException(error)}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 5.2 API Route Handler Error Wrapper

```typescript
// Route handler wrapper
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { success: false, message: error.message, errors: error.details?.errors },
          { status: 400 }
        );
      }
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 }
        );
      }
      // Unexpected errors
      Sentry.captureException(error);
      return NextResponse.json(
        { success: false, message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  };
}
```

### 5.3 Server Action Error Handling

```typescript
// Server actions return typed results, never throw to client
export async function createPost(formData: FormData): Promise<ActionResult<Post>> {
  try {
    const validated = createPostSchema.parse(formData);
    const post = await postsRepository.create(validated);
    revalidateTag('posts');
    return { success: true, data: post };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      };
    }
    Sentry.captureException(error);
    return { success: false, message: 'Failed to create post' };
  }
}
```

---

## 6. Validation Strategy

### 6.1 Zod Schemas

All user inputs validated at the boundary:

| Layer | Validator | Scope |
|-------|-----------|-------|
| Public Forms | Zod schema + Server Action | Form submissions, newsletter signup |
| API Endpoints | Zod schema + Route Handler | All API requests |
| Server Actions | Zod schema | Dashboard mutations |
| Client Forms | Zod schema + React Hook Form | Client-side validation before submit |

### 6.2 Validation Rule

- Every API endpoint has a Zod schema
- Schemas live in `packages/validation/`
- Schemas are shared between client and server
- File uploads validated server-side (MIME, size, extension)

---

## 7. External Service Error Handling

### 7.1 Retry Strategy

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### 7.2 Service-Specific Fallbacks

| Service | Fallback |
|---------|----------|
| Resend (Email) | Queue for retry, log failure, admin alert |
| Telegram | Log failure, retry next cron cycle |
| WhatsApp | Log failure, retry next cron cycle |
| R2 (Storage) | Return fallback image, retry on next request |
| Sentry | No-op in dev, graceful degradation in prod |

---

## 8. Monitoring & Alerting

### 8.1 Sentry Configuration

| Property | Value |
|----------|-------|
| DSN | Per environment |
| Sample Rate | 1.0 (dev/staging), 0.1 (production) |
| Performance Tracing | Enabled for API routes |
| User Context | Attached when available (not PII) |
| Release Tracking | CI pipeline tags releases |

### 8.2 Error Alert Thresholds

| Condition | Action |
|-----------|--------|
| 5+ errors in 5 minutes (same endpoint) | Slack notification |
| Any 500 on `/api/leads`, `/api/payments`, `/api/projects` | Immediate email |
| External service failure > 3 consecutive retries | Admin dashboard alert |
| Any unhandled rejection | Sentry critical issue |

### 8.3 Dashboard Error Indicator

The dashboard shows a subtle status indicator in the footer when any of:
- External service errors in last hour
- Background job failures in last 24 hours
- Failed email dispatches > 5 in last hour

---

## 9. Background Job Error Handling

### 9.1 Job Failure Model

```typescript
interface JobResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    item: string;
    error: string;
    attempt: number;
  }>;
}
```

### 9.2 Job Retry Logic

| Job | Max Retries | Retry Delay | Failure Action |
|-----|-------------|-------------|----------------|
| Content Scheduler | 3 | 1 min | Log + alert if > 3 consecutive failures |
| Newsletter Dispatcher | 3 per email | Exponential backoff | Log failed emails, continue batch |
| Media Cleanup | 1 | N/A | Log failures, retry next day |
| Search Indexer | 2 | 5 min | Log + continue |

### 9.3 Newsletter Dispatcher Error Scenarios

| Scenario | Handling |
|----------|----------|
| Resend API down | Retry batch in next cron cycle (1 min) |
| Individual email bounce | Mark as bounced, continue batch |
| Rate limited (429) | Backoff 60s, resume |
| Invalid email format | Skip, log to campaign analytics |
| Campaign segment empty | Mark campaign as error with reason |

### 9.4 Media Cleanup Error Scenarios

| Scenario | Handling |
|----------|----------|
| R2 delete failure | Log error, retry next run |
| File not found in R2 (but DB record exists) | Mark as orphan, skip R2 deletion |
| DB update fails after R2 move | Log critical — inconsistent state |
| Concurrent cron execution (overlapping runs) | Skip if previous run still active (lock using DB advisory lock) |

---

## 10. Logging Strategy

### 10.1 Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Unhandled errors, external service failures, validation failures on critical paths |
| WARN | Rate limit approaching, retry attempts, deprecated API usage |
| INFO | Successful operations, background job results, authentication events |
| DEBUG | Development only — never in production |

### 10.2 Structured Log Format

```typescript
interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  requestId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}
```

---

## 11. Recovery Procedures

| Scenario | Recovery |
|----------|----------|
| Failed migration | Rollback via `drizzle-kit rollback`, fix, re-apply |
| Data corruption | Restore from daily backup (Supabase point-in-time) |
| R2 data loss | Cross-region replication, no immediate recovery needed for cache |
| Cron job stuck | Manual trigger via dashboard button |
| Service outage | Auto-failover (Vercel handles compute, Cloudflare handles CDN) |
| Deploy failure | Auto-rollback to previous stable deployment (Vercel) |
