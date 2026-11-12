export type NotificationSeverity = "info" | "warning" | "error" | "success";

export type NotificationChannel = "email" | "telegram" | "whatsapp";

export type NotificationTrigger =
  | "new_lead"
  | "lead_won"
  | "new_freelance_project"
  | "milestone_completed"
  | "payment_received"
  | "deliverable_approved"
  | "revision_requested"
  | "new_event_inquiry"
  | "event_confirmed"
  | "event_upcoming_reminder"
  | "invoice_generated"
  | "overdue_payment";

export type NotificationStatus = "pending" | "sent" | "failed" | "cancelled";

export interface Notification {
  id: string;
  trigger: NotificationTrigger;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TemplateData {
  [key: string]: string | number | boolean | Date | undefined;
}
