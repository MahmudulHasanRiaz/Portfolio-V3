import postgres from "postgres";
import type { VentureFilters, VentureRow, VentureListResponse } from "./types";

type Sql = postgres.Sql<{}>;

/** Empty-string dates must become NULL: `founded_date = ''` is a Postgres error. */
function normaliseValue(key: string, value: unknown): unknown {
  if (key === "foundedDate" && value === "") return null;
  return value;
}

export interface MediaMentionRow {
  id: string;
  title: string | null;
  slug: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedDate: string | null;
  summary: string | null;
  isFeatured: boolean | null;
  status: string | null;
  ventureId: string | null;
  createdAt: string | null;
}

export interface MediaMentionInput {
  title?: string;
  slug?: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedDate?: string | null;
  summary?: string;
  isFeatured?: boolean;
  status?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export class VentureRepository {
  constructor(private sql: Sql) {}

  async list(filters: VentureFilters = {}): Promise<VentureListResponse> {
    const { search, status, contentStatus, categoryId, industry, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (search) {
      conditions.push(`(v.name ILIKE $${params.length + 1} OR v.description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push(`v.status = $${params.length + 1}`);
      params.push(status);
    }
    if (contentStatus) {
      conditions.push(`v.content_status = $${params.length + 1}`);
      params.push(contentStatus);
    }
    if (industry) {
      conditions.push(`v.industry = $${params.length + 1}`);
      params.push(industry);
    }

    let fromClause = "FROM ventures v";
    if (categoryId) {
      conditions.push(`vca.category_id = $${params.length + 1}::uuid`);
      params.push(categoryId);
      fromClause += " JOIN venture_category_assignments vca ON v.id = vca.venture_id";
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total ${fromClause} ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<VentureRow[]>(
      `SELECT v.* ${fromClause} ${where} ORDER BY v.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { ventures: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<VentureRow | null> {
    const rows = await this.sql.unsafe<VentureRow[]>("SELECT * FROM ventures WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<VentureRow | null> {
    const rows = await this.sql.unsafe<VentureRow[]>("SELECT * FROM ventures WHERE slug = $1", [slug]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<VentureRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at", "updated_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now, now];
    // Array values (videos / galleryImages) are jsonb: postgres.js would
    // serialise a bare array as a Postgres array literal, which jsonb
    // rejects — send them as JSON text with an explicit ::jsonb cast.
    const ph: string[] = ["$1", "$2", "$3"];

    for (const [key, rawValue] of Object.entries(data)) {
      const value = normaliseValue(key, rawValue);
      if (value === undefined || value === null || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      if (Array.isArray(value)) {
        vals.push(JSON.stringify(value));
        ph.push(`$${vals.length}::jsonb`);
      } else {
        vals.push(value as any);
        ph.push(`$${vals.length}`);
      }
    }

    const rows = await this.sql.unsafe<VentureRow[]>(
      `INSERT INTO ventures (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<VentureRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, rawValue] of Object.entries(data)) {
      const value = normaliseValue(key, rawValue);
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      // Array values (videos / galleryImages) are jsonb — see create().
      if (Array.isArray(value)) {
        vals.push(JSON.stringify(value));
        sets.push(`${dbCol} = $${vals.length}::jsonb`);
      } else {
        sets.push(`${dbCol} = $${vals.length + 1}`);
        vals.push(value as any);
      }
    }

    if (sets.length === 0) return this.getById(id);
    sets.push("updated_at = NOW()");
    vals.push(id);

    const rows = await this.sql.unsafe<VentureRow[]>(
      `UPDATE ventures SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // No FKs point from products / timeline_events to ventures, so delete
    // the children first — otherwise a deleted venture leaves orphaned
    // products and timeline rows behind. (Media mentions FK to ventures
    // with ON DELETE SET NULL; category assignments cascade.)
    await this.sql.unsafe("DELETE FROM products WHERE venture_id = $1::uuid", [id]);
    await this.sql.unsafe(
      "DELETE FROM timeline_events WHERE source_type = 'venture' AND source_id = $1::uuid",
      [id],
    );
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM ventures WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }

  async getCategories(ventureId: string): Promise<{ id: string; name: string | null; slug: string }[]> {
    return this.sql.unsafe<{ id: string; name: string | null; slug: string }[]>(
      `SELECT vc.id, vc.name, vc.slug FROM venture_category_assignments vca
       JOIN venture_categories vc ON vc.id = vca.category_id
       WHERE vca.venture_id = $1::uuid ORDER BY vc.name`,
      [ventureId]
    );
  }

  async getMediaMentions(ventureId: string, filters: { page?: number; pageSize?: number } = {}): Promise<{
    mentions: Record<string, unknown>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize: ps = 20 } = filters;
    const offset = (page - 1) * ps;
    const countResult = await this.sql.unsafe<{ total: number }[]>(
      "SELECT COUNT(*)::int as total FROM media_mentions WHERE venture_id = $1::uuid",
      [ventureId]
    );
    const total = Number(countResult[0]?.total ?? 0);
    const rows = await this.sql.unsafe(
      "SELECT * FROM media_mentions WHERE venture_id = $1::uuid ORDER BY published_date DESC NULLS LAST LIMIT $2 OFFSET $3",
      [ventureId, ps, offset]
    );
    return { mentions: rows, total, page, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  async createMediaMention(
    ventureId: string,
    data: MediaMentionInput,
  ): Promise<MediaMentionRow> {
    const { randomUUID } = await import("node:crypto");
    const slugBase = slugify(data.slug || data.title || "mention") || "mention";
    const insert = async (slug: string): Promise<MediaMentionRow[]> =>
      this.sql.unsafe<MediaMentionRow[]>(
        `INSERT INTO media_mentions (id, venture_id, title, slug, source_name, source_url, published_date, summary, is_featured, status)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::date, $8, $9, $10) RETURNING *`,
        [
          randomUUID(),
          ventureId,
          data.title ?? null,
          slug,
          data.sourceName ?? null,
          data.sourceUrl ?? null,
          data.publishedDate || null,
          data.summary ?? null,
          data.isFeatured ?? false,
          data.status ?? "draft",
        ],
      );
    try {
      const rows = await insert(slugBase);
      return rows[0]!;
    } catch (error) {
      // Slug is unique — retry once with a random suffix.
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
        const rows = await insert(`${slugBase}-${randomUUID().slice(0, 6)}`);
        return rows[0]!;
      }
      throw error;
    }
  }

  async updateMediaMention(
    id: string,
    data: MediaMentionInput,
  ): Promise<MediaMentionRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];
    const push = (col: string, value: unknown, cast?: string) => {
      vals.push(value as never);
      sets.push(`${col} = $${vals.length}${cast ?? ""}`);
    };
    if (data.title !== undefined) push("title", data.title);
    if (data.slug !== undefined) push("slug", data.slug || null);
    if (data.sourceName !== undefined) push("source_name", data.sourceName);
    if (data.sourceUrl !== undefined) push("source_url", data.sourceUrl);
    if (data.publishedDate !== undefined) push("published_date", data.publishedDate || null, "::date");
    if (data.summary !== undefined) push("summary", data.summary);
    if (data.isFeatured !== undefined) push("is_featured", data.isFeatured);
    if (data.status !== undefined) push("status", data.status);
    if (sets.length === 0) {
      const rows = await this.sql.unsafe<MediaMentionRow[]>(
        "SELECT * FROM media_mentions WHERE id = $1::uuid", [id],
      );
      return rows[0] ?? null;
    }
    vals.push(id);
    const rows = await this.sql.unsafe<MediaMentionRow[]>(
      `UPDATE media_mentions SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals,
    );
    return rows[0] ?? null;
  }

  async deleteMediaMention(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM media_mentions WHERE id = $1::uuid RETURNING id", [id],
    );
    return result.length > 0;
  }

  async setCategories(ventureId: string, categoryIds: string[]): Promise<void> {
    const sql = this.sql;
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM venture_category_assignments WHERE venture_id = $1::uuid", [ventureId]);
      for (const catId of categoryIds) {
        await tx.unsafe(
          "INSERT INTO venture_category_assignments (venture_id, category_id) VALUES ($1::uuid, $2::uuid)",
          [ventureId, catId]
        );
      }
    });
  }
}
