// Website Integrations — token + data-access helpers.
//
// The Astro public site authenticates to the Public Content API with a
// per-integration Bearer token (created in Settings → Website
// Integrations). Only the SHA-256 hash of a token is stored, so the full
// token is returned exactly once — at creation / regeneration — and never
// again (list / patch / delete responses carry only the token prefix).
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb, websiteIntegrations } from "@repo/database";
import {
  auth,
  authorizeByEmail,
  UnauthorizedError,
} from "@repo/auth/server";
import type { NextRequest } from "next/server";

/** SHA-256 hex digest of a presented integration token. */
export function hashIntegrationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateIntegrationToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const token = `wpi_${randomBytes(32).toString("base64url")}`;
  return {
    token,
    tokenHash: hashIntegrationToken(token),
    tokenPrefix: token.slice(0, 8),
  };
}

/**
 * Admin-only guard for the Website Integrations settings routes.
 * Session from the Better Auth cookie; the internal user must hold the
 * admin or super_admin role.
 */
export async function requireIntegrationAdmin(
  request: NextRequest,
): Promise<Awaited<ReturnType<typeof authorizeByEmail>>> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    throw new UnauthorizedError("Unauthorized");
  }
  return authorizeByEmail(session.user.email, "admin", "super_admin");
}

export interface WebsiteIntegrationListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type WebsiteIntegrationRow = typeof websiteIntegrations.$inferSelect;

export function toListItem(
  row: WebsiteIntegrationRow,
): WebsiteIntegrationListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    isActive: row.isActive ?? false,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: (row.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (row.updatedAt ?? new Date(0)).toISOString(),
  };
}

export async function listIntegrations(): Promise<
  WebsiteIntegrationListItem[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(websiteIntegrations)
    .orderBy(desc(websiteIntegrations.createdAt));
  return rows.map(toListItem);
}

export async function createIntegration(
  name: string,
): Promise<{ integration: WebsiteIntegrationListItem; token: string }> {
  const { token, tokenHash, tokenPrefix } = generateIntegrationToken();
  const db = getDb();
  const [row] = await db
    .insert(websiteIntegrations)
    .values({ name, tokenHash, tokenPrefix })
    .returning();
  // The insert always returns the row (no conflict path); guard anyway.
  if (!row) throw new Error("Failed to create website integration");
  return { integration: toListItem(row), token };
}

export async function getIntegrationById(
  id: string,
): Promise<WebsiteIntegrationRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(websiteIntegrations)
    .where(eq(websiteIntegrations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateIntegration(
  id: string,
  patch: { name?: string; isActive?: boolean },
): Promise<WebsiteIntegrationListItem | null> {
  const db = getDb();
  const [row] = await db
    .update(websiteIntegrations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(websiteIntegrations.id, id))
    .returning();
  return row ? toListItem(row) : null;
}

export async function deleteIntegration(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(websiteIntegrations)
    .where(eq(websiteIntegrations.id, id))
    .returning({ id: websiteIntegrations.id });
  return rows.length > 0;
}

export async function regenerateIntegrationToken(
  id: string,
): Promise<{ integration: WebsiteIntegrationListItem; token: string } | null> {
  const { token, tokenHash, tokenPrefix } = generateIntegrationToken();
  const db = getDb();
  const [row] = await db
    .update(websiteIntegrations)
    .set({ tokenHash, tokenPrefix, updatedAt: new Date() })
    .where(eq(websiteIntegrations.id, id))
    .returning();
  if (!row) return null;
  return { integration: toListItem(row), token };
}

export async function findActiveIntegrationByToken(
  token: string,
): Promise<{ id: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(
      and(
        eq(websiteIntegrations.tokenHash, hashIntegrationToken(token)),
        eq(websiteIntegrations.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function hasActiveIntegration(): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: websiteIntegrations.id })
    .from(websiteIntegrations)
    .where(eq(websiteIntegrations.isActive, true))
    .limit(1);
  return rows.length > 0;
}

/**
 * Best-effort last-used bookkeeping: runs after the response is sent, so
 * it never blocks (or fails) the public API call. Safe to call outside a
 * request context — a missing `after` context must not throw.
 */
export function touchIntegrationLastUsed(id: string): void {
  try {
    after(async () => {
      try {
        const db = getDb();
        await db
          .update(websiteIntegrations)
          .set({ lastUsedAt: new Date(), updatedAt: new Date() })
          .where(eq(websiteIntegrations.id, id));
      } catch {
        // Best-effort only — a failed touch must never surface.
      }
    });
  } catch {
    // Called outside a request context — nothing to schedule.
  }
}
