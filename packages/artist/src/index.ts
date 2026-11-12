import { closeDb, getSql } from "@repo/database";
import { ReleaseRepository } from "./release-repository";
import { PlatformRepository } from "./platform-repository";
import { LyricsRepository } from "./lyrics-repository";
import { VideoRepository } from "./video-repository";
import { TimelineRepository } from "./timeline-repository";

export { ReleaseRepository } from "./release-repository";
export { PlatformRepository } from "./platform-repository";
export { LyricsRepository } from "./lyrics-repository";
export { VideoRepository } from "./video-repository";
export { TimelineRepository } from "./timeline-repository";
export * from "./errors";
export * from "./types";

/**
 * Artist repositories backed by the shared singleton postgres client
 * (`getSql()` in @repo/database — one pool of 10 per process).
 *
 * Previously this built a fresh `postgres(connectionString, { max: 10 })`
 * pool on EVERY call and returned a `close()` no route ever called, so
 * every admin API call leaked up to 10 connections until Postgres hit
 * `max_connections` ("too many clients already"). Do not reintroduce a
 * per-call pool here.
 *
 * @param _connectionString accepted (ignored) only so older call sites
 *   passing `process.env.DATABASE_URL` keep compiling; new call sites
 *   call `createArtistRepositories()` with no argument. The singleton —
 *   not the passed string — decides which database is used
 *   (DATABASE_POOL_URL when set, else DATABASE_URL).
 */
export function createArtistRepositories(_connectionString?: string) {
  const sql = getSql();
  return {
    releases: new ReleaseRepository(sql),
    platforms: new PlatformRepository(sql),
    lyrics: new LyricsRepository(sql),
    videos: new VideoRepository(sql),
    timeline: new TimelineRepository(sql),
    // Tests and scripts ONLY — never call from a route: it ends the
    // shared pool every other request in the process is using.
    close: () => closeDb(),
  };
}
