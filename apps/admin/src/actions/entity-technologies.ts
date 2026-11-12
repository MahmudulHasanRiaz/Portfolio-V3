"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { getDb, technologies, projectTechnologies } from "@repo/database";
import { getServerSession } from "@/lib/get-server-session";

// Project technologies.
//
// The public API already serves a project's techs from the
// `project_technologies` join (project_id, technology_id) + the
// `technologies` taxonomy table; only the admin form was missing them.
// `updateContent` does NOT accept a technologies array (the project zod
// schema has no such field — an unknown key is silently stripped), so
// technologies are saved by this parallel action, following the
// `getEntityTags` / `setEntityTags` pattern in ./entity-tags.ts.
//
// Difference from tags: technologies are picked from the existing
// taxonomy (managed at Dashboard → Technologies), never free text —
// so this works with technology IDs, and unknown IDs are ignored
// rather than creating taxonomy rows.

export type TechnologyEntity = "projects";

export interface TechnologyOption {
  id: string;
  name: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
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

export async function listTechnologies(): Promise<TechnologyOption[]> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const rows = await db
    .select({ id: technologies.id, name: technologies.name })
    .from(technologies)
    .orderBy(asc(technologies.name));
  return rows
    .filter((r): r is { id: string; name: string } => typeof r.name === "string" && r.name !== "")
    .map((r) => ({ id: r.id, name: r.name }));
}

export async function getEntityTechnologies(
  entity: TechnologyEntity,
  id: string,
): Promise<TechnologyOption[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  if (entity !== "projects") throw new Error("Unknown entity");
  const db = getDb();
  const rows = await db
    .select({ id: technologies.id, name: technologies.name })
    .from(technologies)
    .innerJoin(
      projectTechnologies,
      eq(projectTechnologies.technologyId, technologies.id),
    )
    .where(eq(projectTechnologies.projectId, id))
    .orderBy(asc(technologies.name));
  return rows.filter(
    (r): r is TechnologyOption =>
      typeof r.name === "string" && r.name !== "",
  );
}

export async function setEntityTechnologies(
  entity: TechnologyEntity,
  id: string,
  technologyIds: string[],
): Promise<TechnologyOption[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  if (entity !== "projects") throw new Error("Unknown entity");
  const db = getDb();
  const clean = cleanIds(technologyIds);
  // Only link technologies that exist — the join has no FK, so an
  // unknown ID would otherwise become a dangling row.
  const existing =
    clean.length > 0
      ? await db
          .select({ id: technologies.id, name: technologies.name })
          .from(technologies)
          .where(inArray(technologies.id, clean))
      : [];
  const valid = existing.filter(
    (r): r is TechnologyOption =>
      typeof r.name === "string" && r.name !== "",
  );
  // Replace this entity's links wholesale.
  await db
    .delete(projectTechnologies)
    .where(eq(projectTechnologies.projectId, id));
  if (valid.length > 0) {
    await db
      .insert(projectTechnologies)
      .values(valid.map((t) => ({ projectId: id, technologyId: t.id })));
  }
  return valid;
}
