import postgres from "postgres";
import type { ProposalDocumentRow, ProposalFilters, ProposalListResponse } from "./types";

type Sql = postgres.Sql<{}>;

// Display shape: proposal_documents has no title/type/content columns of its
// own — the title and type come from the linked proposal template, content is
// the document's resolved_content and the file is its generated pdf_url.
// Aliases are quoted camelCase so the returned rows match ProposalDocumentRow
// (and what the portal pages render) exactly.
const PROPOSAL_DISPLAY_COLUMNS = `
  pd.id AS id,
  pd.template_id AS "templateId",
  pt.name AS title,
  pt.type AS "proposalType",
  pd.resolved_content AS content,
  pd.pdf_url AS "fileUrl",
  pd.version AS version,
  pd.status AS status,
  pd.client_id AS "clientId",
  pd.project_id AS "projectId",
  pd.sent_at AS "sentAt",
  pd.accepted_at AS "acceptedAt",
  pd.rejected_at AS "rejectedAt",
  pd.rejection_reason AS "rejectionReason",
  pd.created_by AS "createdBy",
  pd.created_at AS "createdAt"
`;

const PROPOSAL_DISPLAY_FROM = `FROM proposal_documents pd LEFT JOIN proposal_templates pt ON pt.id = pd.template_id`;

export class ProposalRepository {
  constructor(private sql: Sql) {}

  async listByClient(clientId: string, filters: ProposalFilters = {}): Promise<ProposalListResponse> {
    const { status, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = ["pd.client_id = $1::uuid"];
    const params: postgres.ParameterOrJSON<never>[] = [clientId];

    if (status) {
      conditions.push(`pd.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM proposal_documents pd ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `SELECT ${PROPOSAL_DISPLAY_COLUMNS} ${PROPOSAL_DISPLAY_FROM} ${where} ORDER BY pd.created_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { proposals: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listByProject(projectId: string): Promise<ProposalDocumentRow[]> {
    return this.sql.unsafe<ProposalDocumentRow[]>(
      `SELECT ${PROPOSAL_DISPLAY_COLUMNS} ${PROPOSAL_DISPLAY_FROM} WHERE pd.project_id = $1::uuid ORDER BY pd.created_at DESC`,
      [projectId]
    );
  }

  async getById(id: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `SELECT ${PROPOSAL_DISPLAY_COLUMNS} ${PROPOSAL_DISPLAY_FROM} WHERE pd.id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async accept(id: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<{ id: string }[]>(
      "UPDATE proposal_documents SET status = 'accepted', accepted_at = NOW() WHERE id = $1::uuid AND status = 'sent' RETURNING *",
      [id]
    );
    if (!rows[0]) return null;
    return this.getById(id);
  }

  async reject(id: string, reason: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<{ id: string }[]>(
      "UPDATE proposal_documents SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1 WHERE id = $2::uuid AND status = 'sent' RETURNING *",
      [reason, id]
    );
    if (!rows[0]) return null;
    return this.getById(id);
  }

  async getOpenCount(clientId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM proposal_documents WHERE client_id = $1::uuid AND status = 'sent'",
      [clientId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
