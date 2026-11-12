import postgres from "postgres";
import type { ReleaseFilters, ReleaseRow, ReleaseListResponse } from "./types";

type Sql = postgres.Sql<{}>;

/**
 * UI-facing key -> DB column where the generic camelCase -> snake_case
 * mapping is wrong. The dashboard (and the public API) send `format`, but
 * the column is `release_format` — without this alias every release create
 * and profile save failed with "column format does not exist".
 */
const KEY_ALIASES: Record<string, string> = {
  format: "release_format",
};

/** Empty-string dates must become NULL: `release_date = ''` is a Postgres error. */
function normaliseValue(key: string, value: unknown): unknown {
  if (key === "releaseDate" && value === "") return null;
  return value;
}

function toDbCol(key: string): string {
  const aliased = KEY_ALIASES[key] ?? key;
  return aliased.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export class ReleaseRepository {
  constructor(private sql: Sql) {}

  async list(filters: ReleaseFilters = {}): Promise<ReleaseListResponse> {
    const { search, status, type, format, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (search) {
      conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (format) {
      conditions.push(`release_format = $${params.length + 1}`);
      params.push(format);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM releases ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `SELECT * FROM releases ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { releases: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ReleaseRow | null> {
    const rows = await this.sql.unsafe<ReleaseRow[]>("SELECT * FROM releases WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<ReleaseRow | null> {
    const rows = await this.sql.unsafe<ReleaseRow[]>("SELECT * FROM releases WHERE slug = $1", [slug]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ReleaseRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at", "updated_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now, now];

    for (const [key, rawValue] of Object.entries(data)) {
      const value = normaliseValue(key, rawValue);
      if (value === undefined || value === null || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = toDbCol(key);
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `INSERT INTO releases (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ReleaseRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, rawValue] of Object.entries(data)) {
      const value = normaliseValue(key, rawValue);
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = toDbCol(key);
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    sets.push("updated_at = NOW()");
    vals.push(id);

    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `UPDATE releases SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // No FKs point from the child tables to releases, so delete the
    // children first — otherwise a deleted release leaves orphaned
    // platforms, videos, lyrics and timeline rows behind.
    await this.sql.unsafe("DELETE FROM release_platforms WHERE release_id = $1::uuid", [id]);
    await this.sql.unsafe("DELETE FROM release_videos WHERE release_id = $1::uuid", [id]);
    await this.sql.unsafe("DELETE FROM release_lyrics WHERE release_id = $1::uuid", [id]);
    await this.sql.unsafe(
      "DELETE FROM timeline_events WHERE source_type = 'release' AND source_id = $1::uuid",
      [id],
    );
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM releases WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
