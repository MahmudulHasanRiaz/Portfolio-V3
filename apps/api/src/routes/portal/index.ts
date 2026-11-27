// Portal (client) router — mounted at /api/portal in apps/api/src/index.ts.
// All routes are authenticated through Better Auth (see helpers.ts);
// the only public-by-design surface is none — every route requires a
// portal client session, including search.
import { Hono } from "hono";
import { portalAuthRouter } from "./auth";
import { portalProjectsRouter } from "./projects";
import { portalDeliverablesRouter } from "./deliverables";
import { portalProposalsRouter } from "./proposals";
import { portalInvoicesRouter } from "./invoices";
import { portalMessagesRouter } from "./messages";
import { portalSearchRouter } from "./search";

const portalRouter = new Hono();

portalRouter.route("/auth", portalAuthRouter);
portalRouter.route("/projects", portalProjectsRouter);
portalRouter.route("/deliverables", portalDeliverablesRouter);
portalRouter.route("/proposals", portalProposalsRouter);
portalRouter.route("/invoices", portalInvoicesRouter);
portalRouter.route("/messages", portalMessagesRouter);
portalRouter.route("/search", portalSearchRouter);

export { portalRouter };
