// Portal search — scoped to the signed-in client's own projects,
// deliverables, proposals, invoices and messages. No query logging
// (the old route did not log either).
import { Hono } from "hono";
import { getApiDb } from "../../db";
import { parsePagination, queryParam } from "../../lib/validate";
import { portalSearch, requirePortalClient } from "./helpers";

const search = new Hono();

search.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const q = queryParam(c, "q");
    if (!q || !q.trim()) {
      return c.json({ error: "Search query is required" }, 400);
    }
    const { page, pageSize } = parsePagination(c, { defaultPageSize: 10 });
    const db = getApiDb();
    const { results, total } = await portalSearch(
      db,
      client.clientId,
      q.trim(),
      page,
      pageSize,
    );
    return c.json({
      results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Search failed";
    return c.json({ error: message }, 500);
  }
});

export { search as portalSearchRouter };
