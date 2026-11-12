# Deploying Portfolio V2 with Portainer

The full stack (PostgreSQL + dashboard + client portal + public website) runs
from `docker-compose.yml` at the repository root. One Docker image is built
from the root `Dockerfile`; each app runs from that image.

## 1. Create the stack

Portainer → **Stacks → Add stack → Repository**

| Field | Value |
|-------|-------|
| Name | `portfolio-v2` |
| Repository URL | `https://github.com/MahmudulHasanRiaz/Portfolio-V2` |
| Reference | `refs/heads/main` |
| Compose path | `docker-compose.yml` |

(Private repo → give Portainer a GitHub username + personal access token
with read access when it asks for repository authentication.)

## 2. Environment variables (stack level)

Set these in the stack's **Environment variables** section before deploying:

**Required**

| Variable | Notes |
|----------|-------|
| `POSTGRES_PASSWORD` | Strong DB password |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | First admin login password (step 4) |

**Production URLs** (set before the first build — `NEXT_PUBLIC_*` are baked
into the client bundle at build time; changing them later needs a redeploy
with "Re-pull image and redeploy" / rebuild):

| Variable | Example |
|----------|---------|
| `DASHBOARD_URL` | `https://admin.example.com` (Better Auth origin) |
| `PUBLIC_URL` | `https://example.com` |

**Optional services** (uploads, email, notifications):
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`R2_PUBLIC_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, plus `ADMIN_EMAIL` / `ADMIN_NAME` and port overrides
(`DASHBOARD_PORT`, `PORTAL_PORT`, `WEB_PORT`, `DB_PORT`).

## 3. Services

| Service | Container port | Host port (env) | Notes |
|---------|---------------|-----------------|-------|
| `db` | 5432 | `DB_PORT` (15432) | PostgreSQL 17, data in the `portfolio-v2-pgdata` volume |
| `migrate` | — | — | Runs `drizzle-kit migrate` (all migrations incl. 0004–0006), then exits |
| `storage` | 9000 / 9001 | `STORAGE_PORT` (19000) / `STORAGE_CONSOLE_PORT` (19001) | RustFS — local S3-compatible file storage, data in the `portfolio-v2-storage` volume |
| `storage-init` | — | — | Creates the storage bucket with public-read, then exits |
| `dashboard` | 3000 | `DASHBOARD_PORT` (13300) | Admin dashboard |
| `portal` | 3001 | `PORTAL_PORT` (13301) | Client portal |
| `web` | 3002 | `WEB_PORT` (13302) | Public website |
| `scheduler` | — | — | Calls the dashboard cron route every 5 min on the private network |
| `admin` | — | — | Profile-gated one-off (step 4), never runs with the stack |

Apps start only after migrations complete successfully. All host ports are
stack env vars — change them in one place if the VPS already uses them
(this VPS runs several other stacks; the defaults above avoid the common
3000/3001/5432/9000 ranges).

**File storage is local in this deployment.** The app speaks S3 via its
`R2_*` env vars; the compose points them at the internal RustFS service
(`http://storage:9000`), so uploads and generated PDFs live on this VPS.
Switching to Cloudflare R2 later = set real `R2_*` values in the stack env
and redeploy. Storage env vars: `STORAGE_USER`, `STORAGE_PASSWORD`,
`R2_BUCKET`.

**Domains (riaz.com.bd)** — point the reverse proxy at the host ports:

| Domain | Target |
|--------|--------|
| `riaz.com.bd` | `localhost:13302` (web) |
| `admin.riaz.com.bd` | `localhost:13300` (dashboard) |
| `portal.riaz.com.bd` | `localhost:13301` (portal) |
| `files.riaz.com.bd` | `localhost:19000` (storage) |

Set `DASHBOARD_URL=https://admin.riaz.com.bd` and
`PUBLIC_URL=https://riaz.com.bd` in the stack env **before the first build**
(`NEXT_PUBLIC_*` values are baked into the client bundle).

## 4. Create the first admin (once)

On the host (or Portainer's host console):

```bash
docker compose --profile setup run --rm admin
```

Creates a Super Admin from `ADMIN_EMAIL` (default `admin@example.com`),
`ADMIN_PASSWORD`, `ADMIN_NAME`. Safe to re-run — it detects the existing user.

## 5. After deploy

- Put a reverse proxy (Nginx Proxy Manager, Traefik, Caddy…) in front for
  HTTPS, mapping your domains to ports 3000 / 3001 / 3002.
- Back up the `portfolio-v2-pgdata` volume — it is the only stateful piece
  besides R2.
- Known pre-existing note: `/api/cron/publish` has no auth check in the app;
  the compose publishes scheduled content via the internal network only, but
  the dashboard port itself also exposes the route — restrict it at the
  proxy/firewall level until the hardening phase adds a `CRON_SECRET` check.
