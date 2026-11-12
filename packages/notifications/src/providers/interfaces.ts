import type { SendResult } from "../types";

export interface SendMessageOptions {
  to: string;
  text: string;
  html?: string;
  parseMode?: "HTML" | "Markdown";
  disableNotification?: boolean;
}

export interface TelegramProvider {
  send(options: SendMessageOptions): Promise<SendResult>;
  verifyConnection(): Promise<boolean>;
}

export interface WhatsAppProvider {
  send(options: SendMessageOptions): Promise<SendResult>;
  verifyConnection(): Promise<boolean>;
}
