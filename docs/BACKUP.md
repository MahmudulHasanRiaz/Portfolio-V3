# Database backup — Neon → R2 (daily, free-plan only)

One pg_dump a day of the `portfolio` database, stored as a compressed
custom-format archive in a private R2 bucket, keeping the last 30 days.
The Neon free plan's restore window is only 6 hours — this is the real
backup. Schedule: daily **21:00 UTC = 03:00 Asia/Dhaka** (off-peak).

## Route chosen: GitHub Actions + pg_dump

| | (A) GitHub Actions + pg_dump — CHOSEN | (B) Worker cron + logical dump — REJECTED |
|---|---|---|
| Dump | `pg_dump -Fc` — complete, compressed, `pg_restore` understands it | Hand-rolled SQL/JSON via the Neon HTTP driver; no pg_dump exists in a Worker |
| Restore | `scripts/backup/restore.sh` (below) | Custom loader to write and maintain; easy to get FKs/sequences/enums wrong |
| Free-tier fit | Runner is a normal machine; no Worker limits | Workers Free: **10 ms CPU per invocation (cron included)** and **50 subrequests** — a dump of 94 tables needs 100+ queries and far more CPU |
| Secrets | 3 new GitHub secrets (below) | None new — but the dump would land in the public media bucket (see below) |
| Cost | One dump a day ≈ a few seconds at 0.25–2 CU ≈ **0.06 CU-hours/month** of the free 100 | — |

## Why a separate bucket

Dumps go to **`portfolio-v3-backups`** (private, no public access) — NOT
to `portfolio-v3-media`. That bucket is public by design: its r2.dev URL
serves media to everyone (verified: a media object returns HTTP 200
unauthenticated). A database dump contains admin password hashes, user
emails, lead contact details and integration-token hashes — it must never
be world-readable. A separate private bucket is the fix; encryption on
top of the public bucket would only add key management for no benefit.

## Setup (one-time, by the user — the agent cannot do these)

1. **Create the bucket** — Cloudflare dashboard → R2 → Create bucket:
   name `portfolio-v3-backups`, location APAC (same as the media bucket).
   Do NOT enable public access (r2.dev) or a custom domain.
2. **Create an R2 API token** — R2 → Manage R2 API Tokens → Create API
   Token, permissions Object Read & Write, scope to the
   `portfolio-v3-backups` bucket only. Note the Access Key ID and Secret
   Access Key (shown once).
3. **Add three GitHub secrets** — repo Settings → Secrets and variables
   → Actions → New repository secret:
   - `BACKUP_DATABASE_URL` — the Neon **direct** (non-pooled) connection
     string for project "Project Portfolio", branch
     `br-raspy-mountain-ao8imklh`, database `portfolio`. In the Neon
     dashboard connection dialog, turn pooling OFF — the host must have
     **no `-pooler` suffix**. pg_dump breaks through PgBouncer's
     transaction pooling. The string includes `?sslmode=require`.
   - `R2_BACKUP_ACCESS_KEY_ID` — the token's Access Key ID from step 2.
   - `R2_BACKUP_SECRET_ACCESS_KEY` — the token's Secret Access Key.
4. **Upload the workflow file** — `.github/workflows/backup-db.yml`
   cannot be pushed via the GitHub API (the App lacks the workflows
   permission), so it goes through the GitHub web UI: repo → Actions →
   New workflow → "set up a workflow yourself", paste the file, commit
   to `main`. The file's content is kept with this doc's PR.
5. **Trigger a manual run** — Actions → "Backup — Neon DB to R2" → Run
   workflow. A green run proves the whole path (dump + upload +
   retention). Check the run log for:
   - `pg_restore -l` listing the archive objects ("Archive OK: N objects
     listed") — the dump is a valid, readable archive;
   - the `head-object` output — the object key, size and date in R2.

## What runs every day

`.github/workflows/backup-db.yml` (schedule `0 21 * * *` UTC, plus manual
`workflow_dispatch`):

1. Installs PostgreSQL client 18 from the PGDG apt repo. pg_dump's
   client must be the same version or newer than the server; client 18
   dumps any Neon server (15–18), so the server's exact version does
   not matter. Ubuntu's default client is older.
2. `pg_dump "$BACKUP_DATABASE_URL" -Fc -Z9 --no-owner --no-acl` to
   `portfolio-YYYY-MM-DD.dump`. `--no-owner --no-acl` makes the dump
   restorable by any user into a fresh database (no original roles
   needed).
3. `pg_restore -l` on the dump — fails the job if the archive is
   truncated or corrupt, without needing a live database.
4. `aws s3 cp` to `s3://portfolio-v3-backups/backups/db/<file>` via the
   R2 S3 endpoint, then `head-object` to confirm size/date.
5. `scripts/backup/rotate.sh` — keeps the newest 30 objects under
   `backups/db/`, deletes the rest.

## Restore

Into a **fresh** database (a new Neon branch is the normal target —
never restore over production unless you mean to replace its data):

```bash
# 1. Download the dump (R2 dashboard, or AWS CLI with the same token):
aws s3 cp s3://portfolio-v3-backups/backups/db/portfolio-2026-11-27.dump . \
  --endpoint-url https://b5c9281cd6a0b13348413d683a2bcc31.r2.cloudflarestorage.com

# 2. Sanity-check the archive (lists its objects; fails if corrupt):
pg_restore -l portfolio-2026-11-27.dump | head

# 3. Restore (prints the target host first; needs --yes to run):
scripts/backup/restore.sh portfolio-2026-11-27.dump "<target-database-url>" --yes
```

To restore into a fresh Neon branch: Neon dashboard → Branches → New
branch from the production branch (or empty), copy its direct connection
string, pass it as the target. The branch starts empty; the restore
recreates all 94 tables and their data.

## Cost

- Neon: ~0.06 CU-hours/month (free allowance is 100). Negligible.
- GitHub Actions: ~2–4 minutes/day. Free on a public repo; inside the
  2,000 free minutes/month if the repo ever goes private.
- R2: one dump is a few hundred KB at most (content-only DB; media
  lives in R2 already). 30 days of dumps is a few MB — far under any
  free allowance.

## What is NOT backed up

- **Media** (images, PDFs) — already lives in R2 (`portfolio-v3-media`),
  which is the durable store; a second copy is out of scope.
- **Code** — in git (GitHub).
- **Worker secrets** (DATABASE_URL, tokens) — in the Cloudflare
  dashboard, not in the database.

## Failure modes

- A failed scheduled run notifies the repo owner by GitHub email; the
  run log names the failing step (dump / verify / upload / retention).
  The previous day's dump is still in R2 — nothing is lost by one
  missed day.
- If `pg_dump` fails with a server-version error, bump the client
  version in the workflow (the `postgresql-client-18` install step).
- If the free Neon compute allowance is ever exceeded, the dump fails
  with a connection error — check the Neon dashboard usage, not the
  workflow.
