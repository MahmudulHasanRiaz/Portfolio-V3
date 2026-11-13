// Admin content router — split from content.ts into sub-routers.
// Mounted at /api/admin/content (see routes/admin/index.ts); the
// "./content" import there resolves to this index.ts automatically.
// Each sub-router is mounted at "/" with its routes' FULL original
// paths, so the final URLs are identical to before.
import { Hono } from "hono";
import itemsRoutes from "./items";
import categoriesRoutes from "./categories";
import tagsRoutes from "./tags";
import type { Env } from "./helpers";

const app = new Hono<Env>();

// Static routes FIRST: the items router has a `/:type` catch-all that
// would swallow "/categories" and "/tags" if it mounted first (Hono
// matches in registration order here). The original monolithic
// content.ts registered the static routes before the `/:type` routes.
app.route("/", categoriesRoutes);
app.route("/", tagsRoutes);
app.route("/", itemsRoutes);

export default app;
