// Admin analytics — Hono port of apps/admin/src/app/api/analytics/*/route.ts
// (pages, referrers, search, summary, utm).
//
// Mounted at /api/admin/analytics (see routes/admin/index.ts).
//
// Split from routes/admin/analytics.ts into routes/admin/analytics/:
//   reports.ts — GET /summary, /pages, /referrers, /utm, /search
//   helpers.ts — shared Env/Db types, query-param helpers, and the
//                analytics aggregation logic (moved verbatim, not
//                restructured).
// NOTE: the POST /track public beacon was deleted 2026-11-26 (dead-code
// B4): zero callers anywhere in the tree — no fetch, no beacon, no
// tracking snippet in public/marketplace, no mobile app — so the
// endpoint only ever recorded nothing. If tracking is ever wanted,
// re-add it deliberately with a snippet that posts to it.
// Each sub-router is mounted at "/" so the final URLs are identical
// to before the split. routes/admin/index.ts still imports
// "./analytics", which now resolves to this index.ts.
import { Hono } from "hono";
import reportsRoutes from "./reports";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", reportsRoutes);

export default app;
