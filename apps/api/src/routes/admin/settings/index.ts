// Admin settings router — split of routes/admin/settings.ts.
// Move-only refactor: each sub-router defines its routes with their
// full original paths; mounting both at "/" keeps every final URL
// identical (mounted at /api/admin/settings, see routes/admin/index.ts).
import { Hono } from "hono";
import type { Env } from "./helpers";
import integrationsRoutes from "./integrations";
import valuesRoutes from "./values";

const app = new Hono<Env>();

app.route("/", integrationsRoutes);
app.route("/", valuesRoutes);

export default app;
