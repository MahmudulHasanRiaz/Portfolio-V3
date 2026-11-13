// Entity tag links — Hono port of apps/admin/src/actions/entity-tags.ts
// (getEntityTags / setEntityTags).
//
// Mounted at /api/admin/entity-tags (see routes/admin/index.ts).
//
// Project / case-study tags. Posts already have tags via the `post_tags`
// join; projects and case studies get the same shape from migration
// 0028: `project_tags` (project_id, tag_id) and `case_study_tags`
// (case_study_id, tag_id), both pointing at the existing `tags` table
// (slug is unique). Tags are entered by name (comma-separated); missing
// tag rows are created, and the entity's links are replaced wholesale.
//
// Fidelity notes:
// - GET returns the tag NAMES (string[]), ordered by tags.name —
//   exactly what the server action returned.
// - POST takes { tags: string } (the raw comma-separated input) and
//   returns the cleaned names (string[]), exactly as the action did.
// - The Neon HTTP driver has no transaction support, so the replace
//   (delete + insert) runs as sequential statements — the same
//   non-atomic pattern the content router uses for setCategories.
import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { caseStudyTags, projectTags, tags } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

type TaggableEntity = "projects" | "case_studies";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseTagNames(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(",")) {
    const name = part.trim();
    if (!name) continue;
    const key = slugify(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function toNames(rows: { name: string | null }[]): string[] {
  return rows
    .map((r) => (typeof r.name === "string" ? r.name : ""))
    .filter(Boolean);
}

function parseEntity(value: string): TaggableEntity | null {
  return value === "projects" || value === "case_studies" ? value : null;
}

// GET /:entity/:id — the entity's tag names, ordered by name.
app.get("/:entity/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entity = parseEntity(c.req.param("entity"));
    if (!entity) return c.json({ error: "Unknown entity" }, 400);
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const db = getApiDb();
    if (entity === "projects") {
      const rows = await db
        .select({ name: tags.name })
        .from(tags)
        .innerJoin(projectTags, eq(projectTags.tagId, tags.id))
        .where(eq(projectTags.projectId, id))
        .orderBy(tags.name);
      return c.json(toNames(rows));
    }
    const rows = await db
      .select({ name: tags.name })
      .from(tags)
      .innerJoin(caseStudyTags, eq(caseStudyTags.tagId, tags.id))
      .where(eq(caseStudyTags.caseStudyId, id))
      .orderBy(tags.name);
    return c.json(toNames(rows));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:entity/:id { tags: string } — replace the entity's tags
// wholesale (create missing tag rows first), return the cleaned names.
app.post("/:entity/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entity = parseEntity(c.req.param("entity"));
    if (!entity) return c.json({ error: "Unknown entity" }, 400);
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const body = (await c.req.json().catch(() => null)) as {
      tags?: unknown;
    } | null;
    const rawTags = typeof body?.tags === "string" ? body.tags : "";
    const db = getApiDb();
    const clean = parseTagNames(rawTags);
    // Ensure the tag rows exist (slug is unique on `tags`).
    for (const name of clean) {
      await db
        .insert(tags)
        .values({ name, slug: slugify(name) })
        .onConflictDoNothing({ target: tags.slug });
    }
    const slugs = clean.map((n) => slugify(n));
    const tagRows =
      slugs.length > 0
        ? await db
            .select({ id: tags.id })
            .from(tags)
            .where(inArray(tags.slug, slugs))
        : [];
    // Replace this entity's links wholesale (sequential statements —
    // Neon HTTP has no transaction support).
    if (entity === "projects") {
      await db.delete(projectTags).where(eq(projectTags.projectId, id));
      if (tagRows.length > 0) {
        await db
          .insert(projectTags)
          .values(tagRows.map((t) => ({ projectId: id, tagId: t.id })));
      }
    } else {
      await db.delete(caseStudyTags).where(eq(caseStudyTags.caseStudyId, id));
      if (tagRows.length > 0) {
        await db
          .insert(caseStudyTags)
          .values(tagRows.map((t) => ({ caseStudyId: id, tagId: t.id })));
      }
    }
    return c.json(clean);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
