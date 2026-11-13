// Admin leads router — split from routes/admin/leads.ts (move-only).
// Mounts the items and notes sub-routers at "/" so final URLs are
// identical to before. Mounted at /api/admin/leads
// (see routes/admin/index.ts).
import { Hono } from "hono";
import itemsRoutes from "./items";
import notesRoutes from "./notes";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", itemsRoutes);
app.route("/", notesRoutes);

export default app;
