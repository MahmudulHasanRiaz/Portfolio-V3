import { pgTable, uuid, text, varchar, jsonb } from "drizzle-orm/pg-core";

export const releaseLyrics = pgTable("release_lyrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").unique(),
  lyricsText: text("lyrics_text"),
  lyricsLanguage: varchar("lyrics_language", { length: 10 }),
  translations: jsonb("translations"),
  status: varchar("status", { length: 20 }).default("draft"),
});
