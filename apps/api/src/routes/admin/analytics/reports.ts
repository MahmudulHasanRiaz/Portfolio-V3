// Admin analytics read routes — moved verbatim from
// routes/admin/analytics.ts (split into routes/admin/analytics/).
//
// Mounted at /api/admin/analytics (see routes/admin/index.ts).
//
// Fidelity notes:
// - The five read routes require a session (requireAuth → 401) and keep
//   the originals' fixed error strings ("Failed to fetch pages." etc.),
//   which are part of the response contract.
import { Hono } from "hono";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  clampQueryInt,
  daysAgo,
  getTopPages,
  getTopReferrers,
  getTopSearchQueries,
  getTrafficSummary,
  getUTMPerformance,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

// GET /pages — { pages: [{ path, views }] }
app.get("/pages", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const pages = await getTopPages(getApiDb(), limit, daysAgo(days));
    return c.json({ pages });
  } catch (err) {
    console.error("[Analytics Pages] Error:", err);
    return c.json({ error: "Failed to fetch pages." }, 500);
  }
});

// GET /referrers — { referrers: [{ referrer, count }] }
app.get("/referrers", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const referrers = await getTopReferrers(getApiDb(), limit, daysAgo(days));
    return c.json({ referrers });
  } catch (err) {
    console.error("[Analytics Referrers] Error:", err);
    return c.json({ error: "Failed to fetch referrers." }, 500);
  }
});

// GET /search — { queries: [{ query, count }] } (search-query analytics,
// NOT the main search endpoint — that lives in routes/admin/search/main.ts)
app.get("/search", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const queries = await getTopSearchQueries(getApiDb(), limit, daysAgo(days));
    return c.json({ queries });
  } catch (err) {
    console.error("[Analytics Search] Error:", err);
    return c.json({ error: "Failed to fetch search analytics." }, 500);
  }
});

// GET /summary — the TrafficSummary object itself (no wrapper)
app.get("/summary", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const summary = await getTrafficSummary(getApiDb(), daysAgo(days));
    return c.json(summary);
  } catch (err) {
    console.error("[Analytics Summary] Error:", err);
    return c.json({ error: "Failed to fetch summary." }, 500);
  }
});

// GET /utm — { utmData: [{ utmSource, utmMedium, utmCampaign, visits, leads }] }
app.get("/utm", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const utmData = await getUTMPerformance(getApiDb(), limit, daysAgo(days));
    return c.json({ utmData });
  } catch (err) {
    console.error("[Analytics UTM] Error:", err);
    return c.json({ error: "Failed to fetch UTM data." }, 500);
  }
});

export default app;
