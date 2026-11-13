// Profile admin — Hono port of apps/admin/src/actions/profile.ts
// (getProfile / saveProfile / getDesignations / saveDesignations).
//
// Mounted at /api/admin/profile (see routes/admin/index.ts).
//
// The `person_profiles` row (name / email / location / phone / bio)
// plus the `designations` + `designations_bn` settings keys (arrays
// of { title, description? }) that the public site reads via
// getPublicSettings. Settings keys are created on first save — no
// migration — following the site-copy route pattern. The two keys are
// separate (designations_bn is a positional overlay by index, NOT
// nested inside designations); both key names come from @repo/shared.
//
// Fidelity notes:
// - GET /profile returns the first person_profiles row (oldest
//   createdAt), or all-null fields when there is no row — exactly as
//   the action returned it.
// - PUT /profile validates the email the same way (invalid email →
//   400 "Enter a valid email address") and updates the existing row
//   (stamping updatedAt) or inserts the first row.
// - GET /profile/designations unwraps the two settings keys the same
//   way (raw array, or a { value: array } wrapper); PUT cleans both
//   lists to at most 5 titled entries and upserts each key (update
//   when it exists, create only when the list is non-empty).
// - The settings-table helpers mirror SettingsRepository.findByKey /
//   update / create, re-implemented with direct Drizzle over
//   getApiDb() (the repository is TCP-bound via getDb()).
import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { personProfiles, settings } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { DESIGNATIONS_BN_KEY, DESIGNATIONS_KEY } from "../../lib/shared";
import { z } from "zod";
import { updatePersonProfileSchema } from "@repo/validation";
import { isRecord, readJsonBody, validateBody } from "../../lib/validate";

// Local schema for PUT /designations: at most 5 entries per list;
// titles at most 100 chars, descriptions at most 255 chars. Titles
// have NO min length: the profile page always sends 5 padded rows
// (empty `{ title: "", description: "" }` rows included) and
// cleanDesignations below drops the untitled ones — a min(1) here
// would 400 every save with an empty row.
const designationSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(255).optional(),
});

const saveDesignationsSchema = z.object({
  designations: z.array(designationSchema).max(5).optional(),
  designationsBn: z.array(designationSchema).max(5).optional(),
});

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

type ApiDb = ReturnType<typeof getApiDb>;

export interface Designation {
  title: string;
  description?: string;
}

const DESIGNATION_KEYS = [
  {
    key: DESIGNATIONS_KEY,
    description:
      "Know Me identity cells (5 titles + 1-line descriptions, English) — public site",
  },
  {
    key: DESIGNATIONS_BN_KEY,
    description:
      "Know Me identity cells (5 titles + 1-line descriptions, Bangla) — public site. Empty = show English.",
  },
] as const;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
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
      return description ? { title, description } : { title };
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

async function findSetting(db: ApiDb, key: string) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row ?? null;
}

interface ProfileData {
  id: string | null;
  fullName: string | null;
  email: string | null;
  location: string | null;
  phone: string | null;
  bioShort: string | null;
  bioLong: string | null;
}

function toProfileData(
  row: typeof personProfiles.$inferSelect | undefined,
): ProfileData {
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

// GET / — the profile row (first by createdAt), or all-null fields.
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(personProfiles)
      .orderBy(asc(personProfiles.createdAt))
      .limit(1);
    return c.json(toProfileData(rows[0]));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT / — save the profile row (update the first row, or insert it).
app.put("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // The admin UI clears the email by sending "" (or null); the
    // shared schema's .email() rejects both, so normalize them to
    // "absent" before validating — asText below then stores null,
    // exactly as before. Non-empty values still go through the
    // schema's .email() plus the regex check below.
    const normalized = { ...body };
    if (normalized.email === "" || normalized.email === null) {
      delete normalized.email;
    }
    const v = validateBody(normalized, updatePersonProfileSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    // The shared schema has no length limits, so reuse alone adds no
    // max-length protection (accepted); the original email regex check
    // stays as the second gate. Server-managed fields in the partial
    // schema (id, createdAt, updatedAt) are never read below, so they
    // cannot be written — only the six profile fields are saved.
    const email = asText(data.email);
    if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: "Enter a valid email address" }, 400);
    }
    const values = {
      fullName: asText(data.fullName),
      email,
      location: asText(data.location),
      phone: asText(data.phone),
      bioShort: asText(data.bioShort),
      bioLong: asText(data.bioLong),
    };
    const db = getApiDb();
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
      if (!row) return c.json({ error: "Failed to save profile" }, 500);
      return c.json(toProfileData(row));
    }
    const [row] = await db.insert(personProfiles).values(values).returning();
    if (!row) return c.json({ error: "Failed to save profile" }, 500);
    return c.json(toProfileData(row));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /designations — the two designation lists.
app.get("/designations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [en, bn] = await Promise.all([
      findSetting(db, DESIGNATIONS_KEY),
      findSetting(db, DESIGNATIONS_BN_KEY),
    ]);
    return c.json({
      designations: unwrapDesignations(en?.value),
      designationsBn: unwrapDesignations(bn?.value),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT /designations — save both designation lists.
app.put("/designations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, saveDesignationsSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [enDef, bnDef] = DESIGNATION_KEYS;
    const enValue = cleanDesignations(data.designations);
    const bnValue = cleanDesignations(data.designationsBn);
    for (const { def, value } of [
      { def: enDef, value: enValue },
      { def: bnDef, value: bnValue },
    ]) {
      const existing = await findSetting(db, def.key);
      if (existing) {
        await db
          .update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.id, existing.id));
      } else if (value.length > 0) {
        await db.insert(settings).values({
          key: def.key,
          value,
          group: "brand",
          description: def.description,
        });
      }
    }
    return c.json({ designations: enValue, designationsBn: bnValue });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
