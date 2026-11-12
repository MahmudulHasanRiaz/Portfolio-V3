"use server";

import { eq, inArray } from "drizzle-orm";
import { getDb, tags, projectTags, caseStudyTags } from "@repo/database";
import { getServerSession } from "@/lib/get-server-session";

// Project / case-study tags.
//
// Posts already have tags via the `post_tags` join (ContentTaxonomyService);
// projects and case studies get the same shape from migration 0028:
// `project_tags` (project_id, tag_id) and `case_study_tags`
// (case_study_id, tag_id), both pointing at the existing `tags` table
// (slug is unique). Tags are entered by name (comma-separated); missing
// tag rows are created, and the entity's links are replaced wholesale.

export type TaggableEntity = "projects" | "case_studies";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
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

export async function getEntityTags(
  entity: TaggableEntity,
  id: string,
): Promise<string[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  const db = getDb();
  if (entity === "projects") {
    const rows = await db
      .select({ name: tags.name })
      .from(tags)
      .innerJoin(projectTags, eq(projectTags.tagId, tags.id))
      .where(eq(projectTags.projectId, id))
      .orderBy(tags.name);
    return toNames(rows);
  }
  const rows = await db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(caseStudyTags, eq(caseStudyTags.tagId, tags.id))
    .where(eq(caseStudyTags.caseStudyId, id))
    .orderBy(tags.name);
  return toNames(rows);
}

export async function setEntityTags(
  entity: TaggableEntity,
  id: string,
  rawTags: string,
): Promise<string[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  const db = getDb();
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
  // Replace this entity's links wholesale.
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
  return clean;
}
