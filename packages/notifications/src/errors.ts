import type { NotificationChannel } from "./types";

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly channel?: NotificationChannel,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "NotificationError";
  }
}

export class ProviderNotConfiguredError extends NotificationError {
  constructor(channel: string) {
    super(`Provider not configured: ${channel}`, "PROVIDER_NOT_CONFIGURED");
    this.name = "ProviderNotConfiguredError";
  }
}
