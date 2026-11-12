import type { ActionHandler } from "../types";
import { createTask } from "./create-task";
import { createTimelineEvent } from "./create-timeline-event";
import { createCrmActivity } from "./create-crm-activity";
import { sendNotification } from "./send-notification";
import { assignUser } from "./assign-user";
import { updateStatus } from "./update-status";
import { createFollowUp } from "./create-follow-up";
import { triggerWebhook } from "./trigger-webhook";

const actionRegistry: Record<string, ActionHandler> = {
  create_task: createTask,
  create_timeline_event: createTimelineEvent,
  create_crm_activity: createCrmActivity,
  send_notification: sendNotification,
  assign_user: assignUser,
  update_status: updateStatus,
  create_follow_up: createFollowUp,
  trigger_webhook: triggerWebhook,
};

export function getActionHandler(type: string): ActionHandler | undefined {
  return actionRegistry[type];
}

export function getRegisteredActions(): string[] {
  return Object.keys(actionRegistry);
}

export { actionRegistry };
