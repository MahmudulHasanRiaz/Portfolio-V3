import type { ActionHandler } from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Writes a real row to `lead_activities` (previously this handler only
 * returned a success object and persisted nothing, so a "completed" run
 * had no visible effect anywhere).
 */
export const createCrmActivity: ActionHandler = async (config, triggerPayload, ctx) => {
  const { leadId: configLeadId, activityType, description } = config as {
    leadId?: string;
    activityType?: string;
    description?: string;
  };

  // Lead id: explicit config first, then the trigger payload. Note: a bare
  // payload.id is deliberately NOT used — for non-lead triggers that id
  // belongs to another entity (content, invoice, ...) and would log a
  // bogus activity against a wrong lead.
  const lead = triggerPayload.lead as Record<string, unknown> | undefined;
  const leadId =
    configLeadId ||
    (triggerPayload.leadId as string) ||
    (triggerPayload.lead_id as string) ||
    (typeof lead?.id === "string" ? lead.id : "") ||
    (triggerPayload.entityId as string) ||
    "";

  if (!leadId) {
    return { success: false, error: "Lead ID is required for CRM activity" };
  }

  const resolvedType = activityType || "note";
  const resolvedDescription = description || "Workflow-triggered activity";

  if (!ctx?.sql) {
    // No persistence context (direct/test callers): keep the old shape.
    return {
      success: true,
      data: {
        leadId,
        activityType: resolvedType,
        description: resolvedDescription,
        persisted: false,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (!UUID_RE.test(leadId)) {
    return { success: false, error: `Lead ID is not a UUID, cannot log CRM activity: ${leadId}` };
  }

  try {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await ctx.sql.unsafe(
      `INSERT INTO lead_activities (id, lead_id, activity_type, description, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)`,
      [id, leadId, resolvedType, resolvedDescription, JSON.stringify({ source: "workflow" })],
    );
    return {
      success: true,
      data: {
        id,
        leadId,
        activityType: resolvedType,
        description: resolvedDescription,
        persisted: true,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to create CRM activity: ${err instanceof Error ? err.message : String(err)}` };
  }
};
