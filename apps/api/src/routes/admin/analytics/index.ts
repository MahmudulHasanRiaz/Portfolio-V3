// Admin analytics — Hono port of apps/admin/src/app/api/analytics/*/route.ts
// (pages, referrers, search, summary, track, utm).
//
// Mounted at /api/admin/analytics (see routes/admin/index.ts).
//
// Split from routes/admin/analytics.ts into routes/admin/analytics/:
//   reports.ts — GET /summary, /pages, /referrers, /utm, /search
//   track.ts   — POST /track (public beacon, rate-limited 10/min/IP)
//   helpers.ts — shared Env/Db types, query-param helpers, and the
//                analytics aggregation logic (moved verbatim, not
//                restructured).
// Each sub-router is mounted at "/" so the final URLs are identical
// to before the split. routes/admin/index.ts still imports
// "./analytics", which now resolves to this index.ts.
import { Hono } from "hono";
import reportsRoutes from "./reports";
import trackRoutes from "./track";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", reportsRoutes);
app.route("/", trackRoutes);

export default app;
