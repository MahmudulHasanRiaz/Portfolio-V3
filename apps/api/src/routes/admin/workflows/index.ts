// Admin workflows router — mounts the split sub-routers at "/"
// (see routes/admin/index.ts: app.route("/workflows", workflowsRoutes)).
// Each sub-router defines its routes with their FULL original paths,
// so the final URLs are identical to the single-file version.
//
// NOTE on registration order: crudRoutes registers GET /:id before
// runsRoutes/triggersRoutes register the static GET /runs,
// POST /process and POST /trigger-test. Hono's router always prefers
// a static segment over a `:param` segment at the same position
// regardless of registration order, so /runs, /process and
// /trigger-test can never be captured by /:id — same as before.

// Re-exported for the cron tick (routes/admin/cron.ts imports
// { processNextRun } from "./workflows").
export { processNextRun } from "./helpers";

import { Hono } from "hono";
import crudRoutes from "./crud";
import runsRoutes from "./runs";
import triggersRoutes from "./triggers";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", crudRoutes);
app.route("/", runsRoutes);
app.route("/", triggersRoutes);

export default app;
