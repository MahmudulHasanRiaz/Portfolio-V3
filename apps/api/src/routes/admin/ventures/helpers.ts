// Shared helpers for the admin ventures routes (split from ventures.ts).
// Only helpers used by two or more of the ventures sub-routers live here;
// helpers used by a single sub-router stay in that sub-router's file.

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

export function errorMessage(err: unknown, fallback: string): string {
  // Never return a DB/driver error to the client: Neon wraps a failed
  // query as "Failed query: <SQL>\nparams: <values>", so returning
  // err.message leaks table/column names and submitted values.
  console.error("[Admin Ventures API] Error:", err);
  return fallback;
}

/** Server-managed fields are never client-settable: drop them from
 *  validated data before any DB write. */
export function stripServerManaged(data: Record<string, unknown>): void {
  delete data.id;
  delete data.createdBy;
  delete data.createdAt;
  delete data.updatedAt;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
