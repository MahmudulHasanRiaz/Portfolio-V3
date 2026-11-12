import type { NotificationTrigger, NotificationChannel } from "./types";

export type ChannelMap = Partial<Record<NotificationTrigger, NotificationChannel[]>>;

export interface NotificationRouterConfig {
  defaultChannels?: NotificationChannel[];
  channelMap?: ChannelMap;
}

export class NotificationRouter {
  constructor(private config: NotificationRouterConfig) {}

  getChannels(trigger: NotificationTrigger): NotificationChannel[] {
    const mapped = this.config.channelMap?.[trigger];

    if (mapped && mapped.length > 0) {
      return mapped;
    }

    return this.config.defaultChannels ?? [];
  }

  setChannelMap(map: ChannelMap): void {
    this.config.channelMap = map;
  }
}
