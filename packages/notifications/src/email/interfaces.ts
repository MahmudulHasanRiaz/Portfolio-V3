import type { SendResult } from "../types";

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<SendResult>;
  verifyConnection(): Promise<boolean>;
}
