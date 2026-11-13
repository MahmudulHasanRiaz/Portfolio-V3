// Shared helpers for the admin content routers (split from content.ts).
// These are used by 2+ of items.ts / categories.ts / tags.ts. Helpers
// used by only one sub-file stay in that sub-file.

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

/** Keep only allowlisted keys present in the body (mirrors Zod stripping
 *  unknown keys; explicit nulls are kept so dates can be cleared). */
export function pickFields(
  body: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/** Server-managed fields are never client-settable: drop them from
 *  validated data before any DB write. */
export function stripServerManaged(data: Record<string, unknown>): void {
  delete data.id;
  delete data.createdBy;
  delete data.createdAt;
  delete data.updatedAt;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
