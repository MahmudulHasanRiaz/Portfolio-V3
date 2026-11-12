"use server";

import { asc, eq, ilike } from "drizzle-orm";
import { getDb, platforms, technologies, clients } from "@repo/database";
import { purgePublicCache } from "@repo/shared";
import { getServerSession } from "@/lib/get-server-session";
import { TECHNOLOGY_CATEGORIES } from "@/lib/technology-categories";

// Admin server actions for the public-site directory tables: platforms,
// technologies, clients (migrations 0025–0027, D1a). Drizzle query
// builder throughout, following the website-integrations lib pattern.
// Technologies gained its *_bn columns in 0032, so it follows the
// PR #76 EN + BN pattern like platforms and clients.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asSortOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// ─── Platforms ───────────────────────────────────────────────────────────────

export type PlatformGroup = "music" | "social" | "professional";

export interface PlatformRow {
  id: string;
  name: string;
  url: string;
  handle: string | null;
  group: PlatformGroup;
  icon: string | null;
  subtitle: string | null;
  note: string | null;
  isPrimary: boolean;
  sortOrder: number | null;
  nameBn: string | null;
  subtitleBn: string | null;
}

const PLATFORM_GROUPS: PlatformGroup[] = ["music", "social", "professional"];

function toPlatformRow(r: typeof platforms.$inferSelect): PlatformRow {
  return {
    id: r.id,
    name: r.name ?? "",
    url: r.url ?? "",
    handle: r.handle,
    group: PLATFORM_GROUPS.includes(r.group as PlatformGroup)
      ? (r.group as PlatformGroup)
      : "social",
    icon: r.icon,
    subtitle: r.subtitle,
    note: r.note,
    isPrimary: r.isPrimary ?? false,
    sortOrder: r.sortOrder,
    nameBn: r.nameBn,
    subtitleBn: r.subtitleBn,
  };
}

export async function listPlatforms(params?: {
  search?: string;
}): Promise<PlatformRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const search = (params?.search ?? "").trim();
  const rows = await db
    .select()
    .from(platforms)
    .where(search ? ilike(platforms.name, `%${escapeLike(search)}%`) : undefined)
    .orderBy(asc(platforms.sortOrder), asc(platforms.createdAt));
  return rows.map(toPlatformRow);
}

export async function getPlatformById(id: string): Promise<PlatformRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  const db = getDb();
  const [row] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.id, id))
    .limit(1);
  if (!row) throw new Error("Platform not found");
  return toPlatformRow(row);
}

export interface PlatformInput {
  name: string;
  url: string;
  handle?: string | null;
  group: PlatformGroup;
  icon?: string | null;
  subtitle?: string | null;
  note?: string | null;
  isPrimary?: boolean;
  sortOrder?: number | null;
  nameBn?: string | null;
  subtitleBn?: string | null;
}

function platformValues(data: PlatformInput) {
  const name = asText(data.name);
  const url = asText(data.url);
  if (!name) throw new Error("Name is required");
  if (!url) throw new Error("URL is required");
  if (!PLATFORM_GROUPS.includes(data.group)) throw new Error("Invalid group");
  return {
    name,
    url,
    handle: asText(data.handle),
    group: data.group,
    icon: asText(data.icon),
    subtitle: asText(data.subtitle),
    note: asText(data.note),
    isPrimary: data.isPrimary === true,
    sortOrder: asSortOrder(data.sortOrder),
    nameBn: asText(data.nameBn),
    subtitleBn: asText(data.subtitleBn),
  };
}

export async function createPlatform(
  data: PlatformInput,
): Promise<PlatformRow> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const [row] = await db
    .insert(platforms)
    .values(platformValues(data))
    .returning();
  if (!row) throw new Error("Failed to create platform");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toPlatformRow(row);
}

export async function updatePlatform(
  id: string,
  data: PlatformInput,
): Promise<PlatformRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  const db = getDb();
  const [row] = await db
    .update(platforms)
    .set({ ...platformValues(data), updatedAt: new Date() })
    .where(eq(platforms.id, id))
    .returning();
  if (!row) throw new Error("Platform not found");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toPlatformRow(row);
}

export async function deletePlatform(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  await getDb().delete(platforms).where(eq(platforms.id, id));
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
}

// ─── Technologies ────────────────────────────────────────────────────────────

export interface TechnologyRow {
  id: string;
  name: string;
  nameBn: string | null;
  category: string | null;
  icon: string | null;
  /** Only PHP has a use in the live copy ("Plugin development"). */
  use: string | null;
  useBn: string | null;
  sortOrder: number | null;
}

function toTechnologyRow(r: typeof technologies.$inferSelect): TechnologyRow {
  return {
    id: r.id,
    name: r.name ?? "",
    nameBn: r.nameBn,
    category: r.category,
    icon: r.icon,
    use: r.use,
    useBn: r.useBn,
    sortOrder: r.sortOrder,
  };
}

export async function listTechnologies(params?: {
  search?: string;
}): Promise<TechnologyRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const search = (params?.search ?? "").trim();
  const rows = await db
    .select()
    .from(technologies)
    .where(search ? ilike(technologies.name, `%${escapeLike(search)}%`) : undefined)
    .orderBy(asc(technologies.sortOrder), asc(technologies.name));
  return rows.map(toTechnologyRow);
}

export async function getTechnologyById(id: string): Promise<TechnologyRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  const db = getDb();
  const [row] = await db
    .select()
    .from(technologies)
    .where(eq(technologies.id, id))
    .limit(1);
  if (!row) throw new Error("Technology not found");
  return toTechnologyRow(row);
}

export interface TechnologyInput {
  name: string;
  nameBn?: string | null;
  category?: string | null;
  icon?: string | null;
  use?: string | null;
  useBn?: string | null;
  sortOrder?: number | null;
}

function technologyValues(data: TechnologyInput) {
  const name = asText(data.name);
  if (!name) throw new Error("Name is required");
  if (
    data.category !== undefined &&
    data.category !== null &&
    data.category !== "" &&
    !(TECHNOLOGY_CATEGORIES as readonly string[]).includes(data.category)
  ) {
    throw new Error("Invalid category");
  }
  return {
    name,
    nameBn: asText(data.nameBn),
    category: asText(data.category),
    icon: asText(data.icon),
    use: asText(data.use),
    useBn: asText(data.useBn),
    sortOrder: asSortOrder(data.sortOrder),
  };
}

export async function createTechnology(
  data: TechnologyInput,
): Promise<TechnologyRow> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const [row] = await db
    .insert(technologies)
    .values(technologyValues(data))
    .returning();
  if (!row) throw new Error("Failed to create technology");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toTechnologyRow(row);
}

export async function updateTechnology(
  id: string,
  data: TechnologyInput,
): Promise<TechnologyRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  const db = getDb();
  const [row] = await db
    .update(technologies)
    .set(technologyValues(data))
    .where(eq(technologies.id, id))
    .returning();
  if (!row) throw new Error("Technology not found");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toTechnologyRow(row);
}

export async function deleteTechnology(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  await getDb().delete(technologies).where(eq(technologies.id, id));
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  sortOrder: number | null;
  nameBn: string | null;
}

function toClientRow(r: typeof clients.$inferSelect): ClientRow {
  return {
    id: r.id,
    name: r.name ?? "",
    logoUrl: r.logoUrl,
    website: r.website,
    sortOrder: r.sortOrder,
    nameBn: r.nameBn,
  };
}

export async function listClients(params?: {
  search?: string;
}): Promise<ClientRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const search = (params?.search ?? "").trim();
  const rows = await db
    .select()
    .from(clients)
    .where(search ? ilike(clients.name, `%${escapeLike(search)}%`) : undefined)
    .orderBy(asc(clients.sortOrder), asc(clients.createdAt));
  return rows.map(toClientRow);
}

export async function getClientById(id: string): Promise<ClientRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  const db = getDb();
  const [row] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  if (!row) throw new Error("Client not found");
  return toClientRow(row);
}

export interface ClientInput {
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  sortOrder?: number | null;
  nameBn?: string | null;
}

function clientValues(data: ClientInput) {
  const name = asText(data.name);
  if (!name) throw new Error("Name is required");
  return {
    name,
    logoUrl: asText(data.logoUrl),
    website: asText(data.website),
    sortOrder: asSortOrder(data.sortOrder),
    nameBn: asText(data.nameBn),
  };
}

export async function createClient(data: ClientInput): Promise<ClientRow> {
  const session = await getServerSession();
  requireUserId(session);
  const db = getDb();
  const [row] = await db
    .insert(clients)
    .values(clientValues(data))
    .returning();
  if (!row) throw new Error("Failed to create client");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toClientRow(row);
}

export async function updateClient(
  id: string,
  data: ClientInput,
): Promise<ClientRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  const db = getDb();
  const [row] = await db
    .update(clients)
    .set({ ...clientValues(data), updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  if (!row) throw new Error("Client not found");
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return toClientRow(row);
}

export async function deleteClient(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  await getDb().delete(clients).where(eq(clients.id, id));
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
}
