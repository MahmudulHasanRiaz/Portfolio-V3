import { closeDb, getSql } from "@repo/database";
import { VentureRepository } from "./venture-repository";
import { ProductRepository } from "./product-repository";
import { TimelineRepository } from "./timeline-repository";
import { CategoryRepository } from "./category-repository";

export { VentureRepository } from "./venture-repository";
export { ProductRepository } from "./product-repository";
export { TimelineRepository } from "./timeline-repository";
export { CategoryRepository } from "./category-repository";
export { VentureNotFoundError, ProductNotFoundError, EntrepreneurError } from "./errors";
export type { VentureRow, ProductRow, CategoryRow, VentureFilters, VentureListResponse } from "./types";
export type { MediaMentionRow, MediaMentionInput } from "./venture-repository";
export type { TimelineEventRow } from "./timeline-repository";

/**
 * Entrepreneur repositories backed by the shared singleton postgres
 * client (`getSql()` in @repo/database — one pool of 10 per process).
 *
 * Previously this built a fresh `postgres(connectionString, { max: 10 })`
 * pool on EVERY call and returned a `close()` no route ever called, so
 * every admin API call leaked up to 10 connections until Postgres hit
 * `max_connections` ("too many clients already"). Do not reintroduce a
 * per-call pool here.
 *
 * @param _connectionString accepted (ignored) only so older call sites
 *   passing `process.env.DATABASE_URL` keep compiling; new call sites
 *   call `createEntrepreneurRepositories()` with no argument. The
 *   singleton — not the passed string — decides which database is used
 *   (DATABASE_POOL_URL when set, else DATABASE_URL).
 */
export function createEntrepreneurRepositories(_connectionString?: string) {
  const sql = getSql();
  return {
    ventures: new VentureRepository(sql),
    products: new ProductRepository(sql),
    timeline: new TimelineRepository(sql),
    categories: new CategoryRepository(sql),
    // Tests and scripts ONLY — never call from a route: it ends the
    // shared pool every other request in the process is using.
    close: () => closeDb(),
  };
}
