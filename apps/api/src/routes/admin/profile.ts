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
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const email = asText(body?.email);
    if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: "Enter a valid email address" }, 400);
    }
    const values = {
      fullName: asText(body?.fullName),
      email,
      location: asText(body?.location),
      phone: asText(body?.phone),
      bioShort: asText(body?.bioShort),
      bioLong: asText(body?.bioLong),
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
    const body = (await c.req.json().catch(() => null)) as {
      designations?: unknown;
      designationsBn?: unknown;
    } | null;
    const db = getApiDb();
    const [enDef, bnDef] = DESIGNATION_KEYS;
    const enValue = cleanDesignations(body?.designations);
    const bnValue = cleanDesignations(body?.designationsBn);
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
