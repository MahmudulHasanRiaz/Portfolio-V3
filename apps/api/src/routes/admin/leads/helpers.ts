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
  // Never return a DB/driver error to the client: Neon wraps a failed
  // query as "Failed query: <SQL>\nparams: <values>", so returning
  // err.message leaks table/column names and submitted values.
  console.error("[Admin Leads API] Error:", err);
  return fallback;
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
