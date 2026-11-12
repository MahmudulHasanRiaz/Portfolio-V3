export type {
  NotificationSeverity,
  NotificationChannel,
  NotificationTrigger,
  NotificationStatus,
  Notification,
  SendResult,
  TemplateData,
} from "./types";

export type {
  EmailAddress,
  EmailAttachment,
  SendEmailOptions,
  EmailProvider,
} from "./email/interfaces";

export type {
  SendMessageOptions,
  TelegramProvider,
  WhatsAppProvider,
} from "./providers/interfaces";

export type {
  QueueJob,
  QueueAdapter,
} from "./queue/types";

export {
  NotificationRouter,
} from "./router";

export type {
  ChannelMap,
  NotificationRouterConfig,
} from "./router";

export type {
  NotificationTemplate,
} from "./templates/types";

export {
  NotificationError,
  ProviderNotConfiguredError,
} from "./errors";

export {
  calculateBackoff,
  shouldRetry,
} from "./retry";

export type {
  RetryConfig,
} from "./retry";

export { DEFAULT_RETRY_CONFIG } from "./retry";
