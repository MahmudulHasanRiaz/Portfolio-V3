// Entity technology links — Hono port of
// apps/admin/src/actions/entity-technologies.ts (listTechnologies /
// getEntityTechnologies / setEntityTechnologies).
//
// Mounted at /api/admin/entity-technologies (see routes/admin/index.ts).
//
// The public API already serves a project's techs from the
// `project_technologies` join (project_id, technology_id) + the
// `technologies` taxonomy table; these endpoints are the admin form's
// read/write side. Technologies are picked from the existing taxonomy
// (managed at Dashboard → Technologies), never free text — so this
// works with technology IDs, and unknown IDs are ignored rather than
// creating taxonomy rows.
//
// Fidelity notes:
// - GET / returns the technology OPTIONS ({ id, name }[], ordered by
//   name) — the picker list, exactly as the action returned it. This
//   is NOT the directory endpoint (which returns the full
//   TechnologyRow); the shape here is deliberately the smaller
//   { id, name } pair.
// - GET /:entity/:id returns the entity's linked technologies as the
//   same { id, name } options, ordered by name.
// - POST /:entity/:id { technologyIds: string[] } replaces the links
//   wholesale (only IDs that exist are linked) and returns the linked
//   options. The Neon HTTP driver has no transaction support, so the
//   replace runs as sequential statements.
import { Hono } from "hono";
import { asc, eq, inArray } from "drizzle-orm";
import { projectTechnologies, technologies } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";
import { isRecord, readJsonBody, validateBody } from "../../lib/validate";

// Local schema: replace the entity's technology links with the given
// existing-technology ids (at most 100). cleanIds + the existence
// check below are kept as-is (dedupe + ignore unknown ids).
const setEntityTechnologiesSchema = z.object({
  technologyIds: z.array(uuidSchema).max(100),
});

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

export interface TechnologyOption {
  id: string;
  name: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !UUID_RE.test(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function toOptions(
  rows: { id: string; name: string | null }[],
): TechnologyOption[] {
  return rows
    .filter(
      (r): r is TechnologyOption =>
        typeof r.name === "string" && r.name !== "",
    )
    .map((r) => ({ id: r.id, name: r.name }));
}

// GET / — all technologies as { id, name } options, ordered by name.
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select({ id: technologies.id, name: technologies.name })
      .from(technologies)
      .orderBy(asc(technologies.name));
    return c.json(toOptions(rows));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:entity/:id — the entity's linked technologies.
app.get("/:entity/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entity = c.req.param("entity");
    if (entity !== "projects") {
      return c.json({ error: "Unknown entity" }, 400);
    }
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const db = getApiDb();
    const rows = await db
      .select({ id: technologies.id, name: technologies.name })
      .from(technologies)
      .innerJoin(
        projectTechnologies,
        eq(projectTechnologies.technologyId, technologies.id),
      )
      .where(eq(projectTechnologies.projectId, id))
      .orderBy(asc(technologies.name));
    return c.json(toOptions(rows));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:entity/:id { technologyIds: string[] } — replace the entity's
// technology links wholesale (only IDs that exist are linked).
app.post("/:entity/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entity = c.req.param("entity");
    if (entity !== "projects") {
      return c.json({ error: "Unknown entity" }, 400);
    }
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, setEntityTechnologiesSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const clean = cleanIds(v.data.technologyIds);
    // Only link technologies that exist — the join has no FK, so an
    // unknown ID would otherwise become a dangling row.
    const existing =
      clean.length > 0
        ? await db
            .select({ id: technologies.id, name: technologies.name })
            .from(technologies)
            .where(inArray(technologies.id, clean))
        : [];
    const valid = toOptions(existing);
    // Replace this entity's links wholesale (sequential statements —
    // Neon HTTP has no transaction support).
    await db
      .delete(projectTechnologies)
      .where(eq(projectTechnologies.projectId, id));
    if (valid.length > 0) {
      await db
        .insert(projectTechnologies)
        .values(valid.map((t) => ({ projectId: id, technologyId: t.id })));
    }
    return c.json(valid);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
