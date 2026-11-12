"use server";

import { asc, eq } from "drizzle-orm";
import { getDb, personProfiles, SettingsRepository } from "@repo/database";
import { DESIGNATIONS_KEY, DESIGNATIONS_BN_KEY } from "@repo/shared";
import { getServerSession } from "@/lib/get-server-session";

// Profile admin: the `person_profiles` row (name / email / location /
// phone / bio) plus the `designations` + `designations_bn` settings keys
// (arrays of { title, description? }) that the public site reads via
// getPublicSettings. Settings keys are created on first save — no
// migration — following the site-copy route pattern. The two keys are
// separate (designations_bn is a positional overlay by index, NOT nested
// inside designations); both key names come from @repo/shared.

export interface Designation {
  title: string;
  description?: string;
}

const DESIGNATION_KEYS = [
  { key: DESIGNATIONS_KEY, description: "Know Me identity cells (5 titles + 1-line descriptions, English) — public site" },
  { key: DESIGNATIONS_BN_KEY, description: "Know Me identity cells (5 titles + 1-line descriptions, Bangla) — public site. Empty = show English." },
] as const;

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

function cleanDesignations(value: unknown): Designation[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 5)
    .map((item) => {
      if (item === null || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const title = typeof rec.title === "string" ? rec.title.trim() : "";
      // The public API drops entries without a title, and omits an empty
      // description — store the same shape it reads.
      if (!title) return null;
      const description =
        typeof rec.description === "string" ? rec.description.trim() : "";
      return description
        ? { title, description }
        : { title };
    })
    .filter((d): d is Designation => d !== null);
}

function unwrapDesignations(raw: unknown): Designation[] {
  if (Array.isArray(raw)) return cleanDesignations(raw);
  if (raw !== null && typeof raw === "object" && "value" in raw) {
    return cleanDesignations((raw as { value: unknown }).value);
  }
  return [];
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
  const db = getDb();
  const rows = await db
    .select()
    .from(personProfiles)
    .orderBy(asc(personProfiles.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      id: null,
      fullName: null,
      email: null,
      location: null,
      phone: null,
      bioShort: null,
      bioLong: null,
    };
  }
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    location: row.location,
    phone: row.phone,
    bioShort: row.bioShort,
    bioLong: row.bioLong,
  };
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
  const email = asText(data.email);
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  const values = {
    fullName: asText(data.fullName),
    email,
    location: asText(data.location),
    phone: asText(data.phone),
    bioShort: asText(data.bioShort),
    bioLong: asText(data.bioLong),
  };
  const db = getDb();
  const existing = await db
    .select({ id: personProfiles.id })
    .from(personProfiles)
    .orderBy(asc(personProfiles.createdAt))
    .limit(1);
  if (existing[0]) {
    const [row] = await db
      .update(personProfiles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(personProfiles.id, existing[0].id))
      .returning();
    if (!row) throw new Error("Failed to save profile");
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      location: row.location,
      phone: row.phone,
      bioShort: row.bioShort,
      bioLong: row.bioLong,
    };
  }
  const [row] = await db.insert(personProfiles).values(values).returning();
  if (!row) throw new Error("Failed to save profile");
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    location: row.location,
    phone: row.phone,
    bioShort: row.bioShort,
    bioLong: row.bioLong,
  };
}

export async function getDesignations(): Promise<{
  designations: Designation[];
  designationsBn: Designation[];
}> {
  const session = await getServerSession();
  requireUserId(session);
  const repo = new SettingsRepository();
  const [en, bn] = await Promise.all([
    repo.findByKey(DESIGNATIONS_KEY),
    repo.findByKey(DESIGNATIONS_BN_KEY),
  ]);
  return {
    designations: unwrapDesignations(en?.value),
    designationsBn: unwrapDesignations(bn?.value),
  };
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
  const repo = new SettingsRepository();
  const [enDef, bnDef] = DESIGNATION_KEYS;
  const enValue = cleanDesignations(input.designations);
  const bnValue = cleanDesignations(input.designationsBn);
  for (const { def, value } of [
    { def: enDef, value: enValue },
    { def: bnDef, value: bnValue },
  ]) {
    const existing = await repo.findByKey(def.key);
    if (existing) {
      await repo.update(existing.id, { value });
    } else if (value.length > 0) {
      await repo.create({
        key: def.key,
        value,
        group: "brand",
        description: def.description,
      });
    }
  }
  return { designations: enValue, designationsBn: bnValue };
}
