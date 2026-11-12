import type { ActionHandler } from "../types";

export const assignUser: ActionHandler = async (config, triggerPayload) => {
  const { entityType, entityId: configEntityId, userId } = config as {
    entityType?: string;
    entityId?: string;
    userId?: string;
  };

  const entityId = configEntityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !entityId || !userId) {
    return { success: false, error: "Entity type, entity ID, and user ID are required" };
  }

  return {
    success: true,
    data: {
      entityType,
      entityId,
      userId,
      assignedAt: new Date().toISOString(),
    },
  };
};
