"use server";

import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Profile admin: the `person_profiles` row (name / email / location /
// phone / bio) plus the `designations` + `designations_bn` settings keys
// (arrays of { title, description? }) that the public site reads via
// getPublicSettings.
//
// Hono cutover: get/save profile and designations now go to the Hono
// worker (GET/PUT /api/admin/profile, GET/PUT
// /api/admin/profile/designations) via the typed fetch wrapper in
// @/lib/hono-client — Hono's profile router mirrors this file's
// validation and error messages, so the return shapes and thrown
// errors are unchanged. The DB-direct implementation (drizzle +
// @repo/database getDb / SettingsRepository, postgres.js) is gone — it
// cannot run on the admin Worker. The two designation keys stay
// separate (designations_bn is a positional overlay by index, NOT
// nested inside designations).

export interface Designation {
  title: string;
  description?: string;
}

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

export interface ProfileData {
  id: string | null;
  fullName: string | null;
  email: string | null;
  location: string | null;
  phone: string | null;
  bioShort: string | null;
  bioLong: string | null;
}

export async function getProfile(): Promise<ProfileData> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<ProfileData>("/api/admin/profile");
}

export interface ProfileInput {
  fullName?: string | null;
  email?: string | null;
  location?: string | null;
  phone?: string | null;
  bioShort?: string | null;
  bioLong?: string | null;
}

export async function saveProfile(data: ProfileInput): Promise<ProfileData> {
  const session = await getServerSession();
  requireUserId(session);
  // Same email validation as before, run locally so callers get the
  // error without a network round-trip.
  const email = asText(data.email);
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  return honoFetch<ProfileData>("/api/admin/profile", {
    method: "PUT",
    json: data,
  });
}

export async function getDesignations(): Promise<{
  designations: Designation[];
  designationsBn: Designation[];
}> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<{
    designations: Designation[];
    designationsBn: Designation[];
  }>("/api/admin/profile/designations");
}

export async function saveDesignations(input: {
  designations: Designation[];
  designationsBn: Designation[];
}): Promise<{
  designations: Designation[];
  designationsBn: Designation[];
}> {
  const session = await getServerSession();
  requireUserId(session);
  return honoFetch<{
    designations: Designation[];
    designationsBn: Designation[];
  }>("/api/admin/profile/designations", {
    method: "PUT",
    json: input,
  });
}
