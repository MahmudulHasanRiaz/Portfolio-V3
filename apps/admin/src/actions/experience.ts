"use server";

import { purgePublicCache } from "@repo/shared";
import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Admin server actions for experience entries (0041, PR #35) — the
// dedicated Experience page's rows. Hono cutover pattern (same as
// apps/admin/src/actions/education.ts): the data calls go to the Hono
// worker (GET/POST/PUT/DELETE /api/admin/experience) via the typed
// fetch wrapper; input validation still runs here first, and
// `purgePublicCache(["experience"])` runs after every write
// (best-effort, never fails the save).
//
// The table starts EMPTY — the user enters his real work history
// here; no rows are ever seeded. Two kinds of entries: type 'role'
// (job at an organisation) and type 'project' (project-basis
// engagement for a client, linked to the live project detail page via
// projectSlug). A NULL endDate means ongoing / present.

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

function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export interface ExperienceEntryRow {
  id: string;
  type: string | null;
  title: string | null;
  titleBn: string | null;
  organisation: string | null;
  organisationBn: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  descriptionBn: string | null;
  projectSlug: string | null;
  sortOrder: number | null;
  isVisible: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function listExperienceEntries(): Promise<ExperienceEntryRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<ExperienceEntryRow[]>("/api/admin/experience");
}

export async function getExperienceEntryById(
  id: string,
): Promise<ExperienceEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid experience entry id");
  return honoFetch<ExperienceEntryRow>(`/api/admin/experience/${id}`);
}

export interface ExperienceEntryInput {
  type?: string | null;
  title?: string | null;
  titleBn?: string | null;
  organisation?: string | null;
  organisationBn?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  descriptionBn?: string | null;
  projectSlug?: string | null;
  sortOrder?: number | null;
  isVisible?: boolean | null;
}

function experienceEntryValues(data: ExperienceEntryInput) {
  return {
    type: data.type === "project" ? "project" : "role",
    title: asText(data.title),
    titleBn: asText(data.titleBn),
    organisation: asText(data.organisation),
    organisationBn: asText(data.organisationBn),
    startDate: asDate(data.startDate),
    endDate: asDate(data.endDate),
    description: asText(data.description),
    descriptionBn: asText(data.descriptionBn),
    projectSlug: asText(data.projectSlug),
    sortOrder: asSortOrder(data.sortOrder),
    isVisible:
      typeof data.isVisible === "boolean" ? data.isVisible : true,
  };
}

export async function createExperienceEntry(
  data: ExperienceEntryInput,
): Promise<ExperienceEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  const row = await honoFetch<ExperienceEntryRow>("/api/admin/experience", {
    method: "POST",
    json: experienceEntryValues(data),
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["experience"]);
  return row;
}

export async function updateExperienceEntry(
  id: string,
  data: ExperienceEntryInput,
): Promise<ExperienceEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid experience entry id");
  const row = await honoFetch<ExperienceEntryRow>(
    `/api/admin/experience/${id}`,
    { method: "PUT", json: experienceEntryValues(data) },
  );
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["experience"]);
  return row;
}

export async function deleteExperienceEntry(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid experience entry id");
  await honoFetch<{ success: boolean }>(`/api/admin/experience/${id}`, {
    method: "DELETE",
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["experience"]);
}
