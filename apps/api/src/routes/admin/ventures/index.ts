// Admin ventures routes — split from ventures.ts into this directory.
// Each sub-router defines its routes with their full original paths and is
// mounted at "/" below, so the final URLs are identical to before the
// split. Mounted at /api/admin/ventures by routes/admin/index.ts, whose
// `import venturesRoutes from "./ventures"` resolves to this file.
import { Hono } from "hono";
import itemsRoutes from "./items";
import categoriesRoutes from "./categories";
import mediaRoutes from "./media";
import timelineRoutes from "./timeline";
import type { Env } from "./helpers";

const app = new Hono<Env>();

// Static routes FIRST: the items router has a `/:id` catch-all that
// would swallow "/categories" if it mounted first (Hono matches in
// registration order here). The original monolithic ventures.ts
// registered the static routes before the `/:id` routes.
app.route("/", categoriesRoutes);
app.route("/", mediaRoutes);
app.route("/", timelineRoutes);
app.route("/", itemsRoutes);

export default app;
