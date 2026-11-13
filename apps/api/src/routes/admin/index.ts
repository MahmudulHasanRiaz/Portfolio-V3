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
import settingsRoutes from "./settings";
import homepageRoutes from "./homepage";
import usersRoutes from "./users";
import revisionsRoutes from "./revisions";
import financeRoutes from "./finance";
import leadsRoutes from "./leads";
import proposalsRoutes from "./proposals";
import abandonedRoutes from "./abandoned";
import analyticsRoutes from "./analytics";
import searchRoutes from "./search";
import workflowsRoutes from "./workflows";
import cronRoutes from "./cron";
import mediaRoutes from "./media";
import productsRoutes from "./products";
import freelanceRoutes from "./freelance";

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
app.route("/settings", settingsRoutes);
app.route("/homepage", homepageRoutes);
app.route("/", usersRoutes);
app.route("/", revisionsRoutes);
app.route("/finance", financeRoutes);
app.route("/leads", leadsRoutes);
app.route("/proposals", proposalsRoutes);
app.route("/abandoned", abandonedRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/", searchRoutes);
app.route("/workflows", workflowsRoutes);
app.route("/cron", cronRoutes);
app.route("/media", mediaRoutes);
app.route("/products", productsRoutes);
app.route("/freelance", freelanceRoutes);

export default app;
