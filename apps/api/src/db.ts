// Hono API database layer — Neon HTTP (Cloudflare Workers safe).
// The Next.js admin uses postgres.js (TCP) via @repo/database getDb(),
// which cannot run on Workers. This module is the Workers equivalent:
// @neondatabase/serverless (HTTP transport) + drizzle-orm/neon-http,
// over the SAME Drizzle schema tables (imported directly from the
// schema, not the @repo/database barrel — the barrel pulls in postgres.js).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@repo/database/schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getApiDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  cached = drizzle(neon(url), { schema });
  return cached;
}

export type ApiDb = ReturnType<typeof getApiDb>;
