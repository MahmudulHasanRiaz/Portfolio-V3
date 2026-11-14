// Auto-applied schema ensures (code-level migrations).
//
// The user does not want manual migrations. Additive, idempotent
// column additions that a deployed API version needs are therefore
// applied by the API itself, lazily, the first time a request touches
// the table — instead of by a migration script run by hand.
//
// Pattern (follow it for future additive columns):
//   1. Keep the SQL migration file in packages/database/drizzle/
//      (e.g. 0036_client_logo_display_mode.sql) as the record /
//      source of truth — do NOT delete it.
//   2. Add one `ensureXxx` function here that runs the same
//      `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` via
//      db.execute(). The statement must be idempotent (IF NOT
//      EXISTS), additive only, and safe for existing rows (nullable,
//      no default, no backfill).
//   3. Call it — AWAITED — at the top of every handler that reads or
//      writes the column, before the first query. A module-level
//      promise guards it so the DDL runs at most once per Worker
//      isolate; a failed attempt clears the guard so the next request
//      retries instead of failing forever.
//   4. Never use this for destructive changes (DROP, ALTER TYPE,
//      backfills, data migrations) — those still need a reviewed,
//      manual migration.
import { sql } from "drizzle-orm";
import type { ApiDb } from "../db";

// 0036 (packages/database/drizzle/0036_client_logo_display_mode.sql):
// `logo_display_mode` on `clients` — how a set logo renders.
// Nullable, no default; existing rows keep NULL (= "logo" default).
let clientsLogoDisplayMode: Promise<void> | null = null;

/** Create the `logo_display_mode` column if it does not exist yet.
 *  Idempotent and safe under concurrency (IF NOT EXISTS). Await this
 *  before any query that reads or writes the column. */
export function ensureClientsLogoDisplayMode(db: ApiDb): Promise<void> {
  if (!clientsLogoDisplayMode) {
    clientsLogoDisplayMode = (async () => {
      try {
        await db.execute(
          sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logo_display_mode" text`,
        );
      } catch (err) {
        // A transient failure (e.g. DB unreachable) must not poison
        // the isolate: clear the guard so the next request retries.
        clientsLogoDisplayMode = null;
        throw err;
      }
    })();
  }
  return clientsLogoDisplayMode;
}
