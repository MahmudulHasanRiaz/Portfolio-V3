// Shared helpers for the freelance admin routes (split from freelance.ts).
// Used by 2+ sub-files: projects.ts, milestones.ts, deliverables.ts.
import { getTableColumns } from "drizzle-orm";
import { projectActivityLogs } from "@repo/database/schema";
import { type ApiDb } from "../../../db";

/** Validated data restricted to keys the client actually sent, so an
 *  update never writes a field the client omitted. */
export function sentFields(
  data: Record<string, unknown>,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in body) out[key] = value;
  }
  return out;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Map a body to milestone/deliverable update values. Like bodyFields in
 * update mode, plus `projectId` is never updatable (V2 skipped id /
 * project_id / created_at; these tables have no updated_at column).
 */
export function childUpdateFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "projectId" || key === "createdAt") continue;
    if (!(key in columns)) continue;
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

/**
 * Best-effort activity log (V2 lib/project-activity.ts). Logging must
 * never break the main operation, so every failure is swallowed here.
 */
export async function logProjectActivity(
  db: ApiDb,
  input: {
    projectId: string;
    actorId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.insert(projectActivityLogs).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      actorId: input.actorId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Activity logging is informational only.
  }
}
