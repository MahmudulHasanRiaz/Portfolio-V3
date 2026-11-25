-- Experience entries: role on the engagement (0042, PR #48).
--
-- Project entries had no Role field, so the role labels ("Lead
-- Developer & Architect", "Founder & Lead Developer") could not be
-- entered in the admin. `role` / `role_bn` record the part he played
-- on that project; the value is entered in the admin after deploy —
-- no labels are hard-coded or seeded here. Role entries need no
-- separate role (their title IS the role), so these stay NULL there.
-- The columns are nullable with no default: existing rows keep NULL
-- and render exactly as before (no role line on the card). No other
-- table touched.
-- Re-runnable (IF NOT EXISTS) and additive only. The API
-- auto-applies this at runtime via ensureExperienceEntries() in
-- apps/api/src/lib/ensure-schema.ts (the same code-level auto-apply
-- pattern as 0036–0041) — this file is the record / source of truth,
-- kept in sync with the ensure function.
ALTER TABLE "experience_entries" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "experience_entries" ADD COLUMN IF NOT EXISTS "role_bn" text;
