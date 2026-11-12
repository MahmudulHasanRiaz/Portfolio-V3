import type { ActionHandler } from "../types";

export const createTask: ActionHandler = async (config) => {
  const { title, description, assigneeId, dueInDays } = config as {
    title?: string;
    description?: string;
    assigneeId?: string;
    dueInDays?: number;
  };

  if (!title) {
    return { success: false, error: "Task title is required" };
  }

  return {
    success: true,
    data: {
      title,
      description: description || "",
      assigneeId: assigneeId || null,
      dueInDays: dueInDays || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  };
};
