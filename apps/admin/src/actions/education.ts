"use server";

import { purgePublicCache } from "@repo/shared";
import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Admin server actions for education entries (0039, PR #22) — the
// dedicated Education page's rows. Hono cutover pattern (same as
// apps/admin/src/actions/directory.ts): the data calls go to the Hono
// worker (GET/POST/PUT/DELETE /api/admin/education) via the typed
// fetch wrapper; input validation still runs here first, and
// `purgePublicCache(["education"])` runs after every write
// (best-effort, never fails the save).
//
// The table starts EMPTY — the user enters his real education history
// here; no rows are ever seeded. A NULL endDate means ongoing /
// present.

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

export interface EducationEntryRow {
  id: string;
  degree: string | null;
  degreeBn: string | null;
  institution: string | null;
  institutionBn: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  description: string | null;
  descriptionBn: string | null;
  sortOrder: number | null;
  isVisible: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function listEducationEntries(): Promise<EducationEntryRow[]> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<EducationEntryRow[]>("/api/admin/education");
}

export async function getEducationEntryById(
  id: string,
): Promise<EducationEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid education entry id");
  return honoFetch<EducationEntryRow>(`/api/admin/education/${id}`);
}

export interface EducationEntryInput {
  degree?: string | null;
  degreeBn?: string | null;
  institution?: string | null;
  institutionBn?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
  descriptionBn?: string | null;
  sortOrder?: number | null;
  isVisible?: boolean | null;
}

function educationEntryValues(data: EducationEntryInput) {
  return {
    degree: asText(data.degree),
    degreeBn: asText(data.degreeBn),
    institution: asText(data.institution),
    institutionBn: asText(data.institutionBn),
    fieldOfStudy: asText(data.fieldOfStudy),
    startDate: asDate(data.startDate),
    endDate: asDate(data.endDate),
    grade: asText(data.grade),
    description: asText(data.description),
    descriptionBn: asText(data.descriptionBn),
    sortOrder: asSortOrder(data.sortOrder),
    isVisible:
      typeof data.isVisible === "boolean" ? data.isVisible : true,
  };
}

export async function createEducationEntry(
  data: EducationEntryInput,
): Promise<EducationEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  const row = await honoFetch<EducationEntryRow>("/api/admin/education", {
    method: "POST",
    json: educationEntryValues(data),
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["education"]);
  return row;
}

export async function updateEducationEntry(
  id: string,
  data: EducationEntryInput,
): Promise<EducationEntryRow> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid education entry id");
  const row = await honoFetch<EducationEntryRow>(
    `/api/admin/education/${id}`,
    { method: "PUT", json: educationEntryValues(data) },
  );
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["education"]);
  return row;
}

export async function deleteEducationEntry(id: string): Promise<void> {
  const session = await getServerSession();
  requireUserId(session);
  if (!UUID_RE.test(id)) throw new Error("Invalid education entry id");
  await honoFetch<{ success: boolean }>(`/api/admin/education/${id}`, {
    method: "DELETE",
  });
  // Instant public-site refresh (best-effort, never fails the save).
  void purgePublicCache(["education"]);
}
