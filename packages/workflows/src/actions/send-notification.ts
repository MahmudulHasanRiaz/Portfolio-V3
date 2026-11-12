import type { ActionHandler } from "../types";

export const sendNotification: ActionHandler = async (config) => {
  const { userId, title, body, type } = config as {
    userId?: string;
    title?: string;
    body?: string;
    type?: string;
  };

  if (!userId || !title) {
    return { success: false, error: "User ID and title are required for notification" };
  }

  return {
    success: true,
    data: {
      userId,
      title,
      body: body || "",
      type: type || "info",
      read: false,
      createdAt: new Date().toISOString(),
    },
  };
};
