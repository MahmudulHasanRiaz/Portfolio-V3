import type { NotificationTrigger, NotificationChannel, TemplateData } from "../types";

export interface NotificationTemplate {
  id: string;
  trigger: NotificationTrigger;
  subjectTemplate: string;
  bodyTemplate: string;
  channel: NotificationChannel;
  render(data: TemplateData): { subject: string; body: string };
}
