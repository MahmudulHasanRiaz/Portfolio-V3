// Admin directory CRUD — split from routes/admin/directory.ts into
// ./clients.ts, ./platforms.ts and ./technologies.ts (shared helpers in
// ./helpers.ts). Mounted at /api/admin/directory by routes/admin/index.ts.
// Each sub-router is mounted at "/" with its routes' full original paths,
// so the final URLs are identical to before the split.
import { Hono } from "hono";
import clientsRoutes from "./clients";
import platformsRoutes from "./platforms";
import technologiesRoutes from "./technologies";

const app = new Hono();

app.route("/", clientsRoutes);
app.route("/", platformsRoutes);
app.route("/", technologiesRoutes);

export default app;
