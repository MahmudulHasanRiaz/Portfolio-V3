// Website Integrations — token helpers for the Hono public API.
// Ported from apps/admin/src/lib/website-integrations.ts, but on the
// Neon HTTP DB layer (not getDb()/postgres.js) and using the Web Crypto
// API for SHA-256 (node:crypto is not available on Workers without the
// nodejs_compat flag; subtle.digest is native). Only the SHA-256 hash
// of a token is stored; a presented token is hashed and looked up.
import { and, eq } from "drizzle-orm";
import { websiteIntegrations } from "@repo/database/schema";
import { getApiDb } from "../db";

/** SHA-256 hex digest of a presented integration token. */
export async function hashIntegrationToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function findActiveIntegrationByToken(
  token: string,
): Promise<{ id: string } | null> {
  const db = getApiDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(
      and(
        eq(websiteIntegrations.tokenHash, await hashIntegrationToken(token)),
        eq(websiteIntegrations.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function hasActiveIntegration(): Promise<boolean> {
  const db = getApiDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(eq(websiteIntegrations.isActive, true))
    .limit(1);
  return rows.length > 0;
}

/**
 * Best-effort last-used bookkeeping. Runs in the background (via the
 * Worker's waitUntil when available) so it never blocks the public API
 * call. A failure must never surface.
 */
export function touchIntegrationLastUsed(
  id: string,
  waitUntil?: (promise: Promise<unknown>) => void,
): void {
  const p = (async () => {
    try {
      const db = getApiDb();
      await db
        .update(websiteIntegrations)
        .set({ lastUsedAt: new Date(), updatedAt: new Date() })
        .where(eq(websiteIntegrations.id, id));
    } catch {
      // Best-effort only.
    }
  })();
  if (waitUntil) {
    try {
      waitUntil(p);
      return;
    } catch {
      // Fall through to fire-and-forget.
    }
  }
  p.catch(() => {});
}
