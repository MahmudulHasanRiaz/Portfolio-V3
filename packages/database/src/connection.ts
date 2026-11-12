import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getDatabaseConfig } from "./config";

let dbClient: ReturnType<typeof drizzle> | null = null;
let poolClient: ReturnType<typeof postgres> | null = null;

/**
 * The single shared postgres client for this process.
 *
 * Every repository factory in the monorepo (artist, entrepreneur, and the
 * drizzle client below) must use this — never `postgres(url, ...)` per
 * call. A fresh pool per API call is never closed by any route, so each
 * call leaked up to 10 connections until Postgres hit `max_connections`
 * ("sorry, too many clients already"). One module-level client bounds
 * the whole process to a single pool of 10.
 *
 * Connection string: DATABASE_POOL_URL when set (PgBouncer on the VPS),
 * else DATABASE_URL (direct Postgres). PgBouncer is the intended
 * deployment: with several Next.js processes each opening its own pool
 * of 10, a direct connection still exhausts a small max_connections.
 */
export function getSql(): ReturnType<typeof postgres> {
  if (poolClient) return poolClient;

  const config = getDatabaseConfig();
  poolClient = postgres(config.DATABASE_POOL_URL ?? config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return poolClient;
}

export function getDb() {
  if (dbClient) return dbClient;

  const config = getDatabaseConfig();
  dbClient = drizzle(getSql(), {
    logger: config.LOG_LEVEL === "debug",
  });

  return dbClient;
}

/**
 * Ends the shared pool and forgets both clients. Tests and scripts
 * ONLY — never call from a route or server action: it closes the pool
 * every other request in the process is using.
 */
export async function closeDb(): Promise<void> {
  if (poolClient) {
    await poolClient.end();
    poolClient = null;
    dbClient = null;
  }
}
