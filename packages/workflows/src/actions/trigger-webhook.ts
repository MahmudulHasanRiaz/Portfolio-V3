import type { ActionHandler } from "../types";

export const triggerWebhook: ActionHandler = async (config, triggerPayload) => {
  const { url, method, headers, bodyTemplate } = config as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };

  if (!url) {
    return { success: false, error: "Webhook URL is required" };
  }

  try {
    const resolvedBody = bodyTemplate
      ? JSON.parse(bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => String(triggerPayload[key] ?? "")))
      : triggerPayload;

    const response = await fetch(url, {
      method: (method || "POST") as "GET" | "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: method === "GET" ? undefined : JSON.stringify(resolvedBody),
    });

    return {
      success: response.ok,
      data: {
        statusCode: response.status,
        statusText: response.statusText,
      },
      error: response.ok ? undefined : `Webhook returned ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Webhook call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
