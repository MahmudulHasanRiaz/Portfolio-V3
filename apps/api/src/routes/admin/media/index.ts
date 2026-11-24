// Admin media library — split from media.ts (move-only refactor).
// Sub-routers live in ./items.ts and ./folders.ts, shared helpers in
// ./helpers.ts. Mounted at "/" so the final URLs are identical to before:
// routes/admin/index.ts mounts this app at /media.
import { Hono } from "hono";
import itemsRoutes from "./items";
import foldersRoutes from "./folders";
import type { Env } from "./helpers";

const app = new Hono<Env>();

// folders BEFORE items: Hono matches routes in registration order, and
// items' GET /:id catch-all would swallow the static /folders collection
// path ("folders" is not a UUID → "Invalid id"). Same lesson as
// routes/admin/content.ts and routes/admin/ventures/index.ts — static
// routes must mount before /:param routers. Safe: folders' routes only
// match /folders* paths, so item routes (GET /:id, POST /upload,
// /:id/restore, …) still resolve after the folders router passes.
app.route("/", foldersRoutes);
app.route("/", itemsRoutes);

export default app;
