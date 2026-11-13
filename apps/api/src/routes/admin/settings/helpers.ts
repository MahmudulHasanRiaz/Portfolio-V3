// Shared helpers for the admin settings sub-routers
// (settings/integrations.ts, settings/values.ts).
// Split from routes/admin/settings.ts — move-only, no behaviour change.

import { getApiDb } from "../../../db";

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

export type ApiDb = ReturnType<typeof getApiDb>;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}
