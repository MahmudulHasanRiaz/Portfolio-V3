// Shared helpers for the releases sub-routers (split from releases.ts).
// Only helpers used by 2+ sub-files live here; single-use helpers stay in
// their own sub-file.

/** Server-managed fields are never client-settable: drop them from
 *  validated data before any DB write. */
export function stripServerManaged(data: Record<string, unknown>): void {
  delete data.id;
  delete data.createdBy;
  delete data.createdAt;
  delete data.updatedAt;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
