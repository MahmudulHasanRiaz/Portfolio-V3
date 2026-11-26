import { z } from "zod";
import { uuidSchema } from "./common";

// ─── Search Index ────────────────────────────────────────────────────────────


// ─── Search Synonyms ─────────────────────────────────────────────────────────

export const searchSynonymSchema = z.object({
  id: uuidSchema,
  term: z.string().max(255),
  synonyms: z.array(z.string()),
});

export const createSearchSynonymSchema = z.object({
  term: z.string().max(255),
  synonyms: z.array(z.string()),
});

export const updateSearchSynonymSchema = searchSynonymSchema.partial();
