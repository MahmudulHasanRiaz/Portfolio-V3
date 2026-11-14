// Shared helpers for the leads sub-routers (items.ts, notes.ts).
// Moved verbatim from routes/admin/leads.ts — behavior unchanged.
import { leadActivities } from "@repo/database/schema";
import { getApiDb } from "../../../db";

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** ActivityRepository.log, re-implemented with direct Drizzle calls. */
export async function logActivity(
  db: ReturnType<typeof getApiDb>,
  leadId: string,
  activityType: string,
  description: string,
  createdBy: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  await db.insert(leadActivities).values({
    leadId,
    activityType,
    description,
    metadata: metadata ?? null,
    createdBy,
  });
}
