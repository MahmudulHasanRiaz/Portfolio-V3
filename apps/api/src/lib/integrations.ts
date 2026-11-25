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

// In-worker memo for integration-token validation (PR #46,
// admin-slow-lists). Every public API call pays one DB round trip to
// validate the Bearer token, and a page render makes several such
// calls in a row — on a cold Neon each trip costs seconds. The
// validation result is therefore cached in module state for 60 s,
// keyed by the token HASH (the raw token is never stored), exactly
// like the settings memos elsewhere in this codebase.
//
// Revocation window (documented behaviour change, same trade-off as
// the settings memos): a token that is revoked or deactivated can
// still validate for up to 60 s after the change, and a request
// made with no token can still see "an integration is active" for up
// to 60 s after the last integration is deactivated (fail-closed —
// it keeps requiring auth). A newly created token is NOT delayed:
// it has no cached entry, so its first presentation always hits the
// DB. Both hits and misses are cached — a wrong token must not pay
// a DB trip on every request either. The cache lives per Worker
// isolate (best-effort under multi-isolate, like the rate limiter).
const TOKEN_VALIDATION_TTL_MS = 60_000;

type TokenValidationEntry = {
  value: { id: string } | null;
  at: number;
};

const tokenValidationCache = new Map<string, TokenValidationEntry>();

let hasActiveCache: { value: boolean; at: number } | undefined;

export async function findActiveIntegrationByToken(
  token: string,
): Promise<{ id: string } | null> {
  const hash = await hashIntegrationToken(token);
  const now = Date.now();
  const hit = tokenValidationCache.get(hash);
  if (hit && now - hit.at < TOKEN_VALIDATION_TTL_MS) return hit.value;
  const db = getApiDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(
      and(
        eq(websiteIntegrations.tokenHash, hash),
        eq(websiteIntegrations.isActive, true),
      ),
    )
    .limit(1);
  const value = rows[0] ?? null;
  tokenValidationCache.set(hash, { value, at: now });
  return value;
}

export async function hasActiveIntegration(): Promise<boolean> {
  const now = Date.now();
  if (
    hasActiveCache &&
    now - hasActiveCache.at < TOKEN_VALIDATION_TTL_MS
  ) {
    return hasActiveCache.value;
  }
  const db = getApiDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(eq(websiteIntegrations.isActive, true))
    .limit(1);
  const value = rows.length > 0;
  hasActiveCache = { value, at: now };
  return value;
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
