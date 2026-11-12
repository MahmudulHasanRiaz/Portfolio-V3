import type { ActionHandler } from "../types";

export const createFollowUp: ActionHandler = async (config) => {
  const { daysFromNow, note, assigneeId } = config as {
    daysFromNow?: number;
    note?: string;
    assigneeId?: string;
  };

  const days = daysFromNow || 1;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  return {
    success: true,
    data: {
      dueDate: dueDate.toISOString(),
      note: note || "",
      assigneeId: assigneeId || null,
      daysFromNow: days,
    },
  };
};
