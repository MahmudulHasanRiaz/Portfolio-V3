import type { ActionHandler } from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Writes a real row to `timeline_events` (previously this handler only
 * returned a success object and persisted nothing, so a "completed" run
 * had no visible effect anywhere).
 */
export const createTimelineEvent: ActionHandler = async (config, triggerPayload, ctx) => {
  const { entityType, entityId, eventType, description, title } = config as {
    entityType?: string;
    entityId?: string;
    eventType?: string;
    description?: string;
    title?: string;
  };

  const resolvedEntityId = entityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !resolvedEntityId) {
    return { success: false, error: "Entity type and entity ID are required" };
  }

  const resolvedTitle = title || description || eventType || "workflow_action";
  const resolvedEventType = eventType || "workflow_action";

  if (!ctx?.sql) {
    // No persistence context (direct/test callers): keep the old shape.
    return {
      success: true,
      data: {
        entityType,
        entityId: resolvedEntityId,
        eventType: resolvedEventType,
        description: description || "",
        persisted: false,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (!UUID_RE.test(resolvedEntityId)) {
    return { success: false, error: `Entity ID is not a UUID, cannot link timeline event: ${resolvedEntityId}` };
  }

  try {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await ctx.sql.unsafe(
      `INSERT INTO timeline_events (id, source_type, source_id, event_type, title, description, event_date)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, CURRENT_DATE)`,
      [id, entityType, resolvedEntityId, resolvedEventType, resolvedTitle, description || null],
    );
    return {
      success: true,
      data: {
        id,
        entityType,
        entityId: resolvedEntityId,
        eventType: resolvedEventType,
        title: resolvedTitle,
        description: description || "",
        persisted: true,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to create timeline event: ${err instanceof Error ? err.message : String(err)}` };
  }
};
