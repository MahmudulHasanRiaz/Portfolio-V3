// Shared helpers for the search sub-routers (search/main.ts,
// search/synonyms.ts). Only items used by 2+ sub-files live here;
// helpers used by a single sub-file stay in that sub-file.

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};
