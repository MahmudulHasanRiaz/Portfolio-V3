# Security Architecture

> **PRD Reference:** [PRD.md](../PRD.md) — Security Architecture (§ Security Architecture), Authentication, RBAC  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Security Principles

| Principle | Implementation |
|-----------|----------------|
| Least Privilege | Role-based access with granular permissions |
| Defense in Depth | Multiple security layers (auth → RBAC → validation → audit) |
| Secure by Default | Private by default, public opt-in |
| Auditability | All sensitive actions logged |
| Scalability | Security model scales with team growth |

---

## 2. Authentication

### 2.1 Provider

| Property | Value |
|----------|-------|
| Library | Better Auth |
| Provider | Supabase PostgreSQL adapter |
| Methods | Email + Password (primary), Magic Link (future-ready), Google OAuth (optional), MFA (future-ready) |
| Session | Server-side session storage, HTTP-only cookies |

### 2.2 Session Management

| Property | Specification |
|----------|---------------|
| Storage | Database-backed sessions |
| Cookie | HTTP-only, Secure, SameSite=Lax |
| Expiry | 7 days (sliding), 30 days (remember me) |
| Revocation | On password change, logout all sessions |
| Refresh | Automatic refresh on API calls |

### 2.3 Password Policy

| Requirement | Rule |
|-------------|------|
| Minimum Length | 8 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 number |
| Hashing | bcrypt (cost factor 12) |
| History | No reuse of last 5 passwords |
| Rate Limit | 5 attempts per 15 minutes per IP |

### 2.4 Route Protection Layers

```
Request → Cookie/Session Check → Auth Middleware → RBAC Check → Permission Check → Handler
```

---

## 3. Access Zones

| Zone | Description | Routes | Auth Required |
|------|-------------|--------|---------------|
| Public | Anyone can access | `/`, `/blog`, `/services`, `/search`, `/contact` | No |
| Authenticated | Any logged-in user | `/dashboard/settings/profile` | Yes |
| Administrative | Admin/Manager roles | `/dashboard/*` (most routes) | Yes + RBAC |
| Restricted | Super Admin only | `/dashboard/users`, `/dashboard/settings/security` | Yes + Super Admin |

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Roles

| Role | Scope | Description |
|------|-------|-------------|
| Super Admin | System-wide | Full access including user/role management, security settings |
| Admin | Platform-wide | All functions except permission architecture and system-level security |
| Writer | Content | Create, edit, publish content (posts, resources) |
| Media Manager | Media | Manage media library, releases, streaming links |
| Sales Executive | CRM | Manage leads, notes, pipeline status |
| Marketer | Marketing | Manage SEO, analytics, newsletter campaigns |
| Project Manager | Operations | Manage freelance projects, milestones, deliverables, portal |
| Finance Manager | Finance | Full finance access (payments, expenses, invoices); read-only projects/events |
| Artist Manager | Events | Manage artist events, logistics, availability; read-only event finance |
| Client | Portal | Read-only project access via portal token; feedback and approvals only |

### 4.2 Permission Granularity

Permissions are stored as individual entities with naming convention `{action}_{resource}`:

```
Content: create_post, edit_post, publish_post, delete_post
Media: upload_media, delete_media, manage_folders
CRM: view_leads, create_lead, edit_lead, delete_lead, assign_lead
Projects: create_project, edit_project, delete_project, manage_milestones
Events: create_event, edit_event, delete_event
Finance: view_finance, create_invoice, approve_expense
System: manage_users, manage_roles, manage_settings
Portal: manage_portal, send_portal_message
SEO: manage_seo, manage_redirects
Newsletter: manage_campaigns, manage_subscribers
```

### 4.3 Permission Checking

```typescript
// Middleware level
export async function requirePermission(permission: string) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (!hasPermission(session.user.id, permission)) {
    throw new ForbiddenError();
  }
}

// Component level
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.roles.includes('super_admin')) return null;
  return <>{children}</>;
}
```

---

## 5. API Security

| Control | Implementation |
|---------|----------------|
| Input Validation | Zod schemas on every endpoint |
| Rate Limiting | Per-endpoint rate limits (see API_DESIGN.md) |
| CSRF Protection | Enabled for cookie-authenticated mutations |
| CORS | Restricted to configured domains |
| Request Size | 10MB max (media uploads via presigned URL) |

### 5.1 Public Form Security

| Measure | Implementation |
|---------|----------------|
| Honeypot | Hidden field (invisible to users, bots fill it) |
| Time-based | Submit time must be > 3s (bot detection) |
| Rate Limit | 3 submissions per IP per 60s |
| Token | Form-specific CSRF token |

---

## 6. File Upload Security

| Check | Rule |
|-------|------|
| MIME Type | Validate against allowlist |
| File Size | Max 10MB (images), 200MB (video) |
| Extension | Allowlist only (jpg, png, webp, avif, mp4, pdf, docx, mp3) |
| Malware | Server-side scanning (if implemented) |
| Storage | R2 presigned URLs for upload, direct-to-S3 pattern |

### Allowed Upload Types

```typescript
const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  documents: ['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm'],
};
```

---

## 7. Data Protection

### 7.1 In Transit

| Layer | Protection |
|-------|------------|
| Client → CDN | TLS 1.3 (enforced) |
| CDN → Vercel | TLS 1.3 |
| Vercel → Database | TLS (enforced via Supabase) |
| Vercel → R2 | TLS (S3-compatible API over HTTPS) |

### 7.2 At Rest

| Data | Protection |
|------|------------|
| Passwords | bcrypt hashed (cost 12) |
| Sessions | Database stored, HTTP-only cookies |
| Auth Tokens | Hashed in database |
| Portal Tokens | Unique, scoped to single project |
| PII | Minimal collection, encrypted backups |

### 7.3 Data Minimization

| Principle | Practice |
|-----------|----------|
| Collect only what's needed | No unnecessary PII fields |
| Retention limits | Abandoned leads auto-purged after 90 days |
| Anonymization | Analytics data anonymized by IP stripping |

---

## 8. Audit Logging

### 8.1 Logged Actions

| Category | Actions |
|----------|---------|
| Authentication | Login, logout, login failure, password change |
| Content | Create, edit, delete, publish, archive (all content types) |
| CRM | Status change, lead assignment, lead deletion |
| Finance | Payment logged, invoice created, invoice status change |
| Admin | User creation, role change, permission change |
| Media | Upload, delete, folder create/delete |
| Settings | Any setting change |

### 8.2 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT now()
);
```

### 8.3 Audit Retention

| Retention Period | Action |
|-----------------|--------|
| 90 days | Hot storage (primary table) |
| 1 year | Warm storage (partitioned archive) |
| Indefinite | Cold storage (exported JSON to R2) |

---

## 9. Vulnerability Protection

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Drizzle ORM (parameterized queries by default) |
| XSS | Rich text sanitization, React's built-in escaping |
| CSRF | Token-based protection on mutating requests |
| Brute Force | Rate limiting + account lockout after 10 failures |
| Session Hijacking | HTTP-only cookies, secure flag, rotation |
| Clickjacking | X-Frame-Options: DENY, CSP headers |
| Open Redirect | URL validation on redirect params |
| Path Traversal | File path sanitization on uploads |
| DoS | Rate limiting + Vercel's automatic protection |

---

## 10. Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clarity.ms;
      style-src 'self' 'unsafe-inline';
      img-src 'self' https: data: blob:;
      media-src 'self' https:;
      font-src 'self';
      connect-src 'self' https://*.sentry.io https://api.resend.com;
      frame-ancestors 'none';
    `.replace(/\s+/g, ' ').trim(),
  },
];
```

---

## 11. Security Compliance

| Standard | Target | Status |
|----------|--------|--------|
| OWASP Top 10 | All categories | Implemented |
| WCAG AA | Accessibility | Implemented |
| GDPR | Data protection | Partial (PII handling) |
| CCPA | California privacy | Future |

---

## 12. Incident Response

| Tier | Trigger | Response |
|------|---------|----------|
| T1 | Rate limit breach | Automatic block, log review |
| T2 | Suspicious login pattern | Manual review, possible IP block |
| T3 | Data breach suspicion | Full incident response: isolate → investigate → notify → patch → postmortem |
| T4 | Confirmed breach | Legal notification, user notification, forensic analysis |

---

## 13. Future Security Enhancements

| Feature | Timeline | Status |
|---------|----------|--------|
| Multi-Factor Authentication (TOTP) | Post-v1 | Planned |
| Security Dashboard (login attempts, active sessions) | Post-v1 | Planned |
| IP Allowlisting for dashboard | Post-v1 | Planned |
| Admin Device Verification | Post-v1 | Future |
| Automated Penetration Testing | Post-v1 | Future |
