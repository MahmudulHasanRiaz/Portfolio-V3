// Admin proposals router — split from routes/admin/proposals.ts
// (move-only refactor, no behavior change). Mounted at
// /api/admin/proposals (see routes/admin/index.ts); "./proposals"
// resolves to this index.ts automatically. Each sub-router defines
// its routes with their FULL original paths, mounted at "/", so the
// final URLs are identical to before.
import { Hono } from "hono";
import documentsRoutes from "./documents";
import templatesRoutes from "./templates";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", documentsRoutes);
app.route("/", templatesRoutes);

export default app;
