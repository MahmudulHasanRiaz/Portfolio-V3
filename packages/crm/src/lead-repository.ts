import postgres from "postgres";
import type { LeadFilters, LeadRow, LeadListResponse } from "./types";

type Sql = postgres.Sql<{}>;

// Explicit aliased column list: postgres.js returns raw snake_case keys
// with SELECT *, but LeadRow and every UI consumer expect camelCase
// (full_name arrived as full_name, so lead.fullName was undefined and
// every lead rendered as "Unnamed").
const LEAD_COLUMNS = 'id, full_name AS "fullName", email, phone, company, country, budget, timeline, project_type AS "projectType", inquiry_type AS "inquiryType", message, lead_source AS "leadSource", status, assigned_user_id AS "assignedUserId", follow_up_date AS "followUpDate", follow_up_notes AS "followUpNotes", converted_to_project_id AS "convertedToProjectId", converted_to_event_id AS "convertedToEventId", utm_source AS "utmSource", utm_medium AS "utmMedium", utm_campaign AS "utmCampaign", utm_content AS "utmContent", utm_term AS "utmTerm", sla_minutes AS "slaMinutes", first_response_at AS "firstResponseAt", response_status AS "responseStatus", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"';

export class LeadRepository {
  constructor(private sql: Sql) {}

  async list(filters: LeadFilters = {}): Promise<LeadListResponse> {
    const { status, source, assignedTo, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`status = ANY($${params.length + 1}::text[])`);
      params.push(statuses as any);
    }
    if (source) {
      conditions.push(`lead_source = $${params.length + 1}`);
      params.push(source);
    }
    if (assignedTo) {
      conditions.push(`assigned_user_id = $${params.length + 1}::uuid`);
      params.push(assignedTo);
    }
    if (search) {
      const idx = params.length + 1;
      conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR phone ILIKE $${idx})`);
      params.push(`%${search}%`);
    }
    if (dateFrom) {
      conditions.push(`created_at >= $${params.length + 1}::timestamp`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`created_at <= $${params.length + 1}::timestamp`);
      params.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM leads ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<LeadRow[]>(
      `SELECT ${LEAD_COLUMNS} FROM leads ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { leads: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>(`SELECT ${LEAD_COLUMNS} FROM leads WHERE id = $1::uuid`, [id]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<LeadRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at", "updated_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<LeadRow[]>(
      `INSERT INTO leads (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${LEAD_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<LeadRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    sets.push("updated_at = NOW()");
    vals.push(id);

    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING ${LEAD_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // lead_notes / lead_activities have no FK cascade to leads, so the
    // child rows must be removed here — otherwise deleting a lead leaves
    // orphaned notes and activities behind. Done in one transaction.
    return this.sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM lead_notes WHERE lead_id = $1::uuid", [id]);
      await tx.unsafe("DELETE FROM lead_activities WHERE lead_id = $1::uuid", [id]);
      const result = await tx.unsafe<{ id: string }[]>(
        "DELETE FROM leads WHERE id = $1::uuid RETURNING id", [id]
      );
      return result.length > 0;
    });
  }

  async changeStatus(id: string, newStatus: string): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING ${LEAD_COLUMNS}`,
      [newStatus, id]
    );
    return rows[0] ?? null;
  }

  async assign(id: string, assignedUserId: string | null): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET assigned_user_id = $1::uuid, updated_at = NOW() WHERE id = $2::uuid RETURNING ${LEAD_COLUMNS}`,
      [assignedUserId, id]
    );
    return rows[0] ?? null;
  }

  async getFollowUpQueue(): Promise<LeadRow[]> {
    return this.sql.unsafe<LeadRow[]>(
      `SELECT ${LEAD_COLUMNS} FROM leads WHERE follow_up_date <= CURRENT_DATE AND status NOT IN ('won', 'lost', 'archived') ORDER BY follow_up_date ASC`
    );
  }

  async getPipelineCounts(): Promise<{ status: string; count: number }[]> {
    return this.sql.unsafe<{ status: string; count: number }[]>(
      "SELECT status, COUNT(*)::int as count FROM leads GROUP BY status ORDER BY status"
    );
  }

  async getSourceBreakdown(): Promise<{ source: string; count: number }[]> {
    return this.sql.unsafe<{ source: string; count: number }[]>(
      "SELECT COALESCE(lead_source, 'unknown') as source, COUNT(*)::int as count FROM leads GROUP BY lead_source ORDER BY count DESC"
    );
  }

  async getConversionCount(): Promise<{ converted: number; total: number }> {
    const rows = await this.sql.unsafe<{ converted: number; total: number }[]>(
      "SELECT COUNT(*) FILTER (WHERE status = 'won')::int as converted, COUNT(*)::int as total FROM leads"
    );
    return rows[0] ?? { converted: 0, total: 0 };
  }
}
