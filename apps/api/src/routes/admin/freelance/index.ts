// Admin freelance routes — split from freelance.ts (move-only refactor).
// Each sub-router defines its routes with their FULL original paths and is
// mounted here at "/", so the final URLs are identical to before:
// /api/admin/freelance/projects, /api/admin/freelance/projects/:id, ...
// routes/admin/index.ts imports "./freelance", which resolves to this
// file (freelance/index.ts) automatically.
import { Hono } from "hono";
import deliverablesRoutes from "./deliverables";
import milestonesRoutes from "./milestones";
import projectsRoutes from "./projects";

const app = new Hono();

app.route("/", projectsRoutes);
app.route("/", milestonesRoutes);
app.route("/", deliverablesRoutes);

export default app;
