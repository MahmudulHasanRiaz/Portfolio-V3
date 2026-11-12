// Admin CRUD router — mounted at /api/admin.
// Sub-routers are added by the CRUD conversion batches (content,
// directory, releases, ventures, ...). Every route under here must
// call requireAuth (see lib/admin-auth) — there is no middleware
// cookie-presence check in Hono.
import { Hono } from "hono";
import contentRoutes from "./content";
import directoryRoutes from "./directory";
import releasesRoutes from "./releases";
import venturesRoutes from "./ventures";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

app.get("/", (c) => c.json({ ok: true, service: "portfolio-v3-api-admin" }));

app.route("/content", contentRoutes);
app.route("/directory", directoryRoutes);
app.route("/releases", releasesRoutes);
app.route("/ventures", venturesRoutes);

export default app;
