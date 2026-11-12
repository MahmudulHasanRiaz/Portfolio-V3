import type { ActionHandler } from "../types";

export const updateStatus: ActionHandler = async (config, triggerPayload) => {
  const { entityType, entityId: configEntityId, newStatus } = config as {
    entityType?: string;
    entityId?: string;
    newStatus?: string;
  };

  const entityId = configEntityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !entityId || !newStatus) {
    return { success: false, error: "Entity type, entity ID, and new status are required" };
  }

  return {
    success: true,
    data: {
      entityType,
      entityId,
      oldStatus: null,
      newStatus,
      updatedAt: new Date().toISOString(),
    },
  };
};
