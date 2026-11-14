// Admin media library — split from media.ts (move-only refactor).
// Sub-routers live in ./items.ts and ./folders.ts, shared helpers in
// ./helpers.ts. Mounted at "/" so the final URLs are identical to before:
// routes/admin/index.ts mounts this app at /media.
import { Hono } from "hono";
import itemsRoutes from "./items";
import foldersRoutes from "./folders";
import type { Env } from "./helpers";

const app = new Hono<Env>();

app.route("/", itemsRoutes);
app.route("/", foldersRoutes);

export default app;
