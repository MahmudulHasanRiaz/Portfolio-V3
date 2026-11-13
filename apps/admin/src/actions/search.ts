"use server";

import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Search synonyms.
//
// Hono cutover: list/create/update/delete synonyms now go to the Hono
// worker (GET/POST/PATCH/DELETE /api/admin/search/synonyms) via the
// typed fetch wrapper in @/lib/hono-client — Hono's search router
// mirrors this file's behaviour, so the return shapes and thrown
// errors are unchanged. The DB-direct implementation (drizzle +
// @repo/database getDb, postgres.js) is gone — it cannot run on the
// admin Worker.

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

export interface SynonymRow {
  id: string;
  term: string | null;
  synonyms: string[] | null;
  isEnabled: boolean;
}

export async function listSynonyms(): Promise<SynonymRow[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<SynonymRow[]>("/api/admin/search/synonyms");
}

export async function createSynonym(data: { term: string; synonyms: string[] }): Promise<SynonymRow> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<SynonymRow>("/api/admin/search/synonyms", {
    method: "POST",
    json: data,
  });
}

export async function updateSynonym(id: string, data: { term?: string; synonyms?: string[]; isEnabled?: boolean }): Promise<SynonymRow> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<SynonymRow>(`/api/admin/search/synonyms/${id}`, {
    method: "PATCH",
    json: data,
  });
}

export async function deleteSynonym(id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(`/api/admin/search/synonyms/${id}`, {
    method: "DELETE",
  });
}
