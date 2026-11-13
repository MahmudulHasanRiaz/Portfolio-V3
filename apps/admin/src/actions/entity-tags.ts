"use server";

import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Project / case-study tags.
//
// Hono cutover: get/set entity tags now go to the Hono worker
// (GET/POST /api/admin/entity-tags/:entity/:id) via the typed fetch
// wrapper in @/lib/hono-client — Hono's entity-tags router mirrors
// this file's validation, tag-name parsing and error messages, so the
// return shapes and thrown errors are unchanged. The DB-direct
// implementation (drizzle + @repo/database getDb, postgres.js) is
// gone — it cannot run on the admin Worker.

export type TaggableEntity = "projects" | "case_studies";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

export async function getEntityTags(
  entity: TaggableEntity,
  id: string,
): Promise<string[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  return honoFetch<string[]>(`/api/admin/entity-tags/${entity}/${id}`);
}

export async function setEntityTags(
  entity: TaggableEntity,
  id: string,
  rawTags: string,
): Promise<string[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  return honoFetch<string[]>(`/api/admin/entity-tags/${entity}/${id}`, {
    method: "POST",
    json: { tags: rawTags },
  });
}
