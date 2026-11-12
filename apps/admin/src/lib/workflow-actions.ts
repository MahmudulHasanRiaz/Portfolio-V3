/**
 * Shared workflow trigger/action metadata for the Workflows admin pages.
 * Kept in one place so the New page and the Detail (edit) page can never
 * drift apart (same trigger types, action types and config fields).
 */

export const TRIGGER_TYPES = [
  "lead_created",
  "lead_status_changed",
  "form_submitted",
  "content_published",
  "venture_published",
  "release_published",
  "proposal_accepted",
  "invoice_paid",
  "payment_received",
  "portal_message_received",
];

export const ACTION_TYPES = [
  "create_task",
  "create_timeline_event",
  "create_crm_activity",
  "send_notification",
  "assign_user",
  "update_status",
  "create_follow_up",
  "trigger_webhook",
];

export interface ActionConfigField {
  key: string;
  label: string;
  type: string;
}

export const ACTION_CONFIG_FIELDS: Record<string, ActionConfigField[]> = {
  create_task: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "assigneeId", label: "Assignee ID", type: "text" },
    { key: "dueInDays", label: "Due In (days)", type: "number" },
  ],
  create_timeline_event: [
    { key: "entityType", label: "Entity Type", type: "text" },
    { key: "eventType", label: "Event Type", type: "text" },
    { key: "description", label: "Description", type: "text" },
  ],
  create_crm_activity: [
    { key: "leadId", label: "Lead ID", type: "text" },
    { key: "activityType", label: "Activity Type", type: "text" },
    { key: "description", label: "Description", type: "text" },
  ],
  send_notification: [
    { key: "userId", label: "User ID", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "body", label: "Body", type: "text" },
    { key: "type", label: "Type (info/warning/success)", type: "text" },
  ],
  assign_user: [
    { key: "entityType", label: "Entity Type", type: "text" },
    { key: "userId", label: "User ID", type: "text" },
  ],
  update_status: [
    { key: "entityType", label: "Entity Type", type: "text" },
    { key: "newStatus", label: "New Status", type: "text" },
  ],
  create_follow_up: [
    { key: "daysFromNow", label: "Days From Now", type: "number" },
    { key: "note", label: "Note", type: "text" },
    { key: "assigneeId", label: "Assignee ID", type: "text" },
  ],
  trigger_webhook: [
    { key: "url", label: "URL", type: "text" },
    { key: "method", label: "Method (GET/POST)", type: "text" },
  ],
};

export interface WorkflowActionEntry {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

/**
 * Action config values come from text inputs, so `type: "number"` fields
 * arrive as strings. The engine does arithmetic on them (e.g. due-date
 * math), and a string there silently produces wrong dates via `+`
 * concatenation. Coerce declared number fields to real numbers here,
 * before the workflow is saved.
 */
export function coerceActionConfigs(
  actions: WorkflowActionEntry[],
): WorkflowActionEntry[] {
  return actions.map((a) => {
    const fields = ACTION_CONFIG_FIELDS[a.type];
    if (!fields) return a;
    const config: Record<string, unknown> = { ...a.config };
    for (const field of fields) {
      if (field.type !== "number") continue;
      const raw = config[field.key];
      if (raw === "" || raw === null || raw === undefined) {
        delete config[field.key];
        continue;
      }
      const num = Number(raw);
      if (Number.isFinite(num)) config[field.key] = num;
    }
    return { ...a, config };
  });
}
