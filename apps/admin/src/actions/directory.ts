"use server";

import { purgePublicCache } from "@repo/shared";
import { getServerSession } from "@/lib/get-server-session";
import { TECHNOLOGY_CATEGORIES } from "@/lib/technology-categories";
import { honoFetch } from "@/lib/hono-client";

// Admin server actions for the public-site directory tables: platforms,
// technologies, clients (migrations 0025–0027, D1a).
//
// Hono cutover: the data calls below go to the Hono worker
// (GET/POST/PUT/DELETE /api/admin/directory/*) via the typed fetch
// wrapper in @/lib/hono-client — Hono's directory router mirrors this
// file's validation, row normalization and error messages, so the return
// shapes and thrown errors are unchanged. What stays local:
//  - input validation (platformValues / technologyValues / clientValues)
//    still runs here first, so callers get the same errors without a
//    network round-trip;
//  - `purgePublicCache(["home"])` after every write — Hono does not wire
//    that side effect yet (its TODO), so the admin keeps doing it
//    best-effort, never failing the save.

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

export async function listPlatforms(params?: {
  search?: string;
}): Promise<PlatformRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const search = (params?.search ?? "").trim();
  return honoFetch<PlatformRow[]>("/api/admin/directory/platforms", {
    query: search ? { search } : undefined,
  });
}

export async function getPlatformById(id: string): Promise<PlatformRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  return honoFetch<PlatformRow>(`/api/admin/directory/platforms/${id}`);
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
  const row = await honoFetch<PlatformRow>("/api/admin/directory/platforms", {
    method: "POST",
    json: platformValues(data),
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function updatePlatform(
  id: string,
  data: PlatformInput,
): Promise<PlatformRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  const row = await honoFetch<PlatformRow>(
    `/api/admin/directory/platforms/${id}`,
    { method: "PUT", json: platformValues(data) },
  );
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function deletePlatform(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid platform id");
  await honoFetch<{ ok: boolean }>(`/api/admin/directory/platforms/${id}`, {
    method: "DELETE",
  });
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

export async function listTechnologies(params?: {
  search?: string;
}): Promise<TechnologyRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const search = (params?.search ?? "").trim();
  return honoFetch<TechnologyRow[]>("/api/admin/directory/technologies", {
    query: search ? { search } : undefined,
  });
}

export async function getTechnologyById(id: string): Promise<TechnologyRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  return honoFetch<TechnologyRow>(
    `/api/admin/directory/technologies/${id}`,
  );
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
  const row = await honoFetch<TechnologyRow>(
    "/api/admin/directory/technologies",
    { method: "POST", json: technologyValues(data) },
  );
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function updateTechnology(
  id: string,
  data: TechnologyInput,
): Promise<TechnologyRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  const row = await honoFetch<TechnologyRow>(
    `/api/admin/directory/technologies/${id}`,
    { method: "PUT", json: technologyValues(data) },
  );
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function deleteTechnology(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid technology id");
  await honoFetch<{ ok: boolean }>(
    `/api/admin/directory/technologies/${id}`,
    { method: "DELETE" },
  );
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

export async function listClients(params?: {
  search?: string;
}): Promise<ClientRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  const search = (params?.search ?? "").trim();
  return honoFetch<ClientRow[]>("/api/admin/directory/clients", {
    query: search ? { search } : undefined,
  });
}

export async function getClientById(id: string): Promise<ClientRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  return honoFetch<ClientRow>(`/api/admin/directory/clients/${id}`);
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
  const row = await honoFetch<ClientRow>("/api/admin/directory/clients", {
    method: "POST",
    json: clientValues(data),
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function updateClient(
  id: string,
  data: ClientInput,
): Promise<ClientRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  const row = await honoFetch<ClientRow>(`/api/admin/directory/clients/${id}`, {
    method: "PUT",
    json: clientValues(data),
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
  return row;
}

export async function deleteClient(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid client id");
  await honoFetch<{ ok: boolean }>(`/api/admin/directory/clients/${id}`, {
    method: "DELETE",
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["home"]);
}
