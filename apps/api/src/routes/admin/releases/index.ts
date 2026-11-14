// Admin releases CRUD — Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/releases/route.ts and
// apps/admin/src/app/api/releases/[id]/route.ts, plus the sub-resources
// apps/admin/src/app/api/releases/[id]/{lyrics,platforms,videos,timeline}/route.ts.
// Mounted at /api/admin/releases by routes/admin/index.ts.
//
// Split from releases.ts into sub-routers (items, platforms, timeline,
// videos, lyrics) mounted at "/" below, so final URLs are identical.
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns
//   { releases, total, page, pageSize, totalPages }; get/create/update
//   return the bare row; delete returns { success: true }. The sources
//   ran raw SQL (snake_case rows) through toCamel; direct Drizzle rows are
//   already keyed by the schema's camelCase property names, so no case
//   conversion is applied (toCamel is shallow, and nested jsonb values —
//   release `credits`, lyrics `translations` — keep their keys untouched
//   either way).
// - Create/update take the dashboard form body verbatim, exactly as the
//   @repo/artist ReleaseRepository did: camelCase keys are mapped to table
//   columns, `format` is aliased to `releaseFormat` (the column is
//   `release_format`), empty-string releaseDate becomes NULL, `id` /
//   `createdAt` / `updatedAt` are never taken from the body, and unknown
//   keys are dropped (the source would have failed the SQL on an unknown
//   column instead — the admin UI only ever sends known fields).
// - Create skips null values (so DB defaults apply, e.g. status "draft");
//   update sets nulls, as in the repository. A body with no updatable
//   fields returns the existing row, as in the repository.
// - Delete removes the child rows first (release_platforms,
//   release_videos, release_lyrics, timeline_events with
//   source_type='release'), because no FKs point from them to releases.
// - Timeline IS implemented: it is plain table CRUD on timeline_events
//   (list / add / delete by eventId in the body), same as the source.
//
// Side effects (wired at cutover via lib/side-effects): the sources also
// (a) indexed / de-indexed the entity via SearchIndexerService,
// (b) dispatched the "release_published" workflow trigger on create, and
// (c) purged the public site cache via purgePublicCache(["releases", "home"]).
import { Hono } from "hono";
import itemsRoutes from "./items";
import platformsRoutes from "./platforms";
import timelineRoutes from "./timeline";
import videosRoutes from "./videos";
import lyricsRoutes from "./lyrics";

const app = new Hono();

app.route("/", itemsRoutes);
app.route("/", platformsRoutes);
app.route("/", timelineRoutes);
app.route("/", videosRoutes);
app.route("/", lyricsRoutes);

export default app;
