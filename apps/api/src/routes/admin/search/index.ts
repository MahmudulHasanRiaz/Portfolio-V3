// Search routes — split from the former search.ts (move-only refactor).
// Mounted at "/" in routes/admin/index.ts, so the full paths
// /search, /search/analytics, /seo/validate and /search/synonyms*
// are preserved exactly.
import { Hono } from "hono";
import mainRoutes from "./main";
import synonymsRoutes from "./synonyms";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", mainRoutes);
app.route("/", synonymsRoutes);

export default app;
