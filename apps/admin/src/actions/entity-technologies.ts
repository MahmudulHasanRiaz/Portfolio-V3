"use server";

import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Project technologies.
//
// Hono cutover: list/get/set entity technologies now go to the Hono
// worker (GET /api/admin/entity-technologies,
// GET/POST /api/admin/entity-technologies/:entity/:id) via the typed
// fetch wrapper in @/lib/hono-client — Hono's entity-technologies
// router mirrors this file's validation and error messages, so the
// return shapes and thrown errors are unchanged. The DB-direct
// implementation (drizzle + @repo/database getDb, postgres.js) is
// gone — it cannot run on the admin Worker.
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

export async function listTechnologies(): Promise<TechnologyOption[]> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<TechnologyOption[]>("/api/admin/entity-technologies");
}

export async function getEntityTechnologies(
  entity: TechnologyEntity,
  id: string,
): Promise<TechnologyOption[]> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid id");
  if (entity !== "projects") throw new Error("Unknown entity");
  return honoFetch<TechnologyOption[]>(
    `/api/admin/entity-technologies/${entity}/${id}`,
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
  return honoFetch<TechnologyOption[]>(
    `/api/admin/entity-technologies/${entity}/${id}`,
    { method: "POST", json: { technologyIds } },
  );
}
