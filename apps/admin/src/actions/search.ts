"use server";

import { getDb, searchSynonyms } from "@repo/database";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/get-server-session";

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

export async function listSynonyms() {
  const session = await getServerSession();
  getUserId(session);
  const db = getDb();
  return db.select().from(searchSynonyms).orderBy(searchSynonyms.term);
}

export async function createSynonym(data: { term: string; synonyms: string[] }) {
  const session = await getServerSession();
  getUserId(session);
  const db = getDb();
  const [result] = await db.insert(searchSynonyms).values(data).returning();
  return result;
}

export async function updateSynonym(id: string, data: { term?: string; synonyms?: string[]; isEnabled?: boolean }) {
  const session = await getServerSession();
  getUserId(session);
  const db = getDb();
  const [result] = await db.update(searchSynonyms).set(data).where(eq(searchSynonyms.id, id)).returning();
  return result;
}

export async function deleteSynonym(id: string) {
  const session = await getServerSession();
  getUserId(session);
  const db = getDb();
  await db.delete(searchSynonyms).where(eq(searchSynonyms.id, id));
}
