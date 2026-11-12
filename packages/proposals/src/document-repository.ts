import postgres from "postgres";
import type {
  ProposalDocumentFilters,
  ProposalDocumentRow,
  ProposalDocumentListResponse,
  ProposalTemplateRow,
  GenerateDocumentInput,
  CreateVersionInput,
  AcceptDocumentResult,
} from "./types";
import { TemplateNotFoundError, TemplateInactiveError, DocumentNotFoundError } from "./errors";

type Sql = postgres.Sql<{}>;

// Aliased columns: unaliased star selects return snake_case keys, while
// ProposalDocumentRow/TemplateRow and every consumer expect camelCase
// (templateId/clientId/sentAt/resolvedContent arrived undefined).
const DOCUMENT_COLUMNS = 'id, template_id AS "templateId", project_id AS "projectId", client_id AS "clientId", resolved_content AS "resolvedContent", status, version, parent_document_id AS "parentDocumentId", pdf_url AS "pdfUrl", sent_at AS "sentAt", accepted_at AS "acceptedAt", rejected_at AS "rejectedAt", rejection_reason AS "rejectionReason", created_by AS "createdBy", created_at AS "createdAt"';
const DOCUMENT_COLUMNS_PD = 'pd.id, pd.template_id AS "templateId", pd.project_id AS "projectId", pd.client_id AS "clientId", pd.resolved_content AS "resolvedContent", pd.status, pd.version, pd.parent_document_id AS "parentDocumentId", pd.pdf_url AS "pdfUrl", pd.sent_at AS "sentAt", pd.accepted_at AS "acceptedAt", pd.rejected_at AS "rejectedAt", pd.rejection_reason AS "rejectionReason", pd.created_by AS "createdBy", pd.created_at AS "createdAt"';
const TEMPLATE_COLUMNS = 'id, name, project_category_id AS "projectCategoryId", client_type AS "clientType", type, content, variables, is_active AS "isActive", created_by AS "createdBy", created_at AS "createdAt"';

/**
 * Substitutes {{key}} placeholders in template content with the given
 * variables. Whitespace inside the braces is allowed ({{ key }}).
 * Placeholders without a matching variable are left untouched.
 */
export function substituteVariables(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key]! : match
  );
}

export class ProposalDocumentRepository {
  constructor(private sql: Sql) {}

  async list(filters: ProposalDocumentFilters = {}): Promise<ProposalDocumentListResponse> {
    const { clientId, projectId, templateId, status, latestOnly, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (clientId) {
      conditions.push(`pd.client_id = $${params.length + 1}::uuid`);
      params.push(clientId);
    }
    if (projectId) {
      conditions.push(`pd.project_id = $${params.length + 1}::uuid`);
      params.push(projectId);
    }
    if (templateId) {
      conditions.push(`pd.template_id = $${params.length + 1}::uuid`);
      params.push(templateId);
    }
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`pd.status::text = ANY($${params.length + 1}::text[])`);
      params.push(statuses as any);
    }
    if (latestOnly) {
      conditions.push(
        "NOT EXISTS (SELECT 1 FROM proposal_documents child WHERE child.parent_document_id = pd.id)"
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM proposal_documents pd ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `SELECT ${DOCUMENT_COLUMNS_PD} FROM proposal_documents pd ${where} ORDER BY pd.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { documents: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `SELECT ${DOCUMENT_COLUMNS} FROM proposal_documents WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM proposal_documents WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProposalDocumentRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `UPDATE proposal_documents SET ${sets.join(", ")} WHERE id = $${vals.length}::uuid RETURNING ${DOCUMENT_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  /**
   * Generates a new draft document (version 1) from a template by
   * substituting the given variables into the template content.
   */
  async generate(input: GenerateDocumentInput): Promise<ProposalDocumentRow> {
    const template = await this.getTemplate(input.templateId);
    if (!template) throw new TemplateNotFoundError(input.templateId);
    // An admin-deactivated template must not generate new documents —
    // the templates UI promises "Active (available when generating
    // documents)". isActive is null for legacy rows: treat null as active
    // so old templates keep working.
    if (template.isActive === false) throw new TemplateInactiveError(input.templateId);

    const resolvedContent = substituteVariables(template.content ?? "", input.variables ?? {});

    return this.insertDocument({
      templateId: input.templateId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      resolvedContent,
      status: "draft",
      version: 1,
      parentDocumentId: null,
      createdBy: input.createdBy ?? null,
    });
  }

  /**
   * Creates the next version of a document as a NEW row (versioning model:
   * every version is a separate proposal_documents row, previous versions
   * stay as history). The new row starts as a draft with no sent/accepted/
   * rejected timestamps.
   */
  async createNewVersion(documentId: string, input: CreateVersionInput = {}): Promise<ProposalDocumentRow> {
    const source = await this.getById(documentId);
    if (!source) throw new DocumentNotFoundError(documentId);

    let resolvedContent: string | null;
    if (input.resolvedContent !== undefined) {
      resolvedContent = input.resolvedContent;
    } else if (input.variables) {
      if (source.templateId) {
        const template = await this.getTemplate(source.templateId);
        if (!template) throw new TemplateNotFoundError(source.templateId);
        resolvedContent = substituteVariables(template.content ?? "", input.variables);
      } else {
        resolvedContent = source.resolvedContent;
      }
    } else {
      resolvedContent = source.resolvedContent;
    }

    return this.insertDocument({
      templateId: source.templateId,
      projectId: source.projectId,
      clientId: source.clientId,
      resolvedContent,
      status: "draft",
      version: source.version + 1,
      parentDocumentId: source.id,
      createdBy: source.createdBy,
    });
  }

  /**
   * Returns every document in the version chain the given document belongs
   * to — from the root ancestor (version 1) down to the latest descendant —
   * ordered by version ascending.
   */
  async listVersionChain(documentId: string): Promise<ProposalDocumentRow[]> {
    const existing = await this.getById(documentId);
    if (!existing) throw new DocumentNotFoundError(documentId);

    // Walk up to the root ancestor.
    const ancestors = await this.sql.unsafe<(ProposalDocumentRow & { depth: number })[]>(
      `WITH RECURSIVE up AS (
         SELECT ${DOCUMENT_COLUMNS_PD}, 0 as depth FROM proposal_documents pd WHERE pd.id = $1::uuid
         UNION ALL
         SELECT ${DOCUMENT_COLUMNS_PD}, up.depth + 1 FROM proposal_documents pd
         JOIN up ON pd.id = up.parent_document_id
       )
       SELECT * FROM up ORDER BY depth DESC`,
      [documentId]
    );
    const root = ancestors.find((row) => row.parentDocumentId === null) ?? ancestors[0];
    if (!root) return [existing];

    // Walk down from the root through all descendants.
    const chain = await this.sql.unsafe<ProposalDocumentRow[]>(
      `WITH RECURSIVE down AS (
         SELECT ${DOCUMENT_COLUMNS_PD} FROM proposal_documents pd WHERE pd.id = $1::uuid
         UNION ALL
         SELECT ${DOCUMENT_COLUMNS_PD} FROM proposal_documents pd
         JOIN down ON pd.parent_document_id = down.id
       )
       SELECT * FROM down ORDER BY version ASC`,
      [root.id]
    );
    return chain;
  }

  async markSent(id: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `UPDATE proposal_documents SET status = 'sent', sent_at = NOW() WHERE id = $1::uuid AND status = 'draft' RETURNING ${DOCUMENT_COLUMNS}`,
      [id]
    );
    return rows[0] ?? null;
  }

  /**
   * Marks a sent document as accepted. Per the PRD, when the document is
   * not linked to a project yet, a projects_freelance record is auto-created
   * (prefilled with the document's client) and linked back to the document.
   */
  async accept(id: string): Promise<AcceptDocumentResult | null> {
    const existing = await this.getById(id);
    if (!existing) throw new DocumentNotFoundError(id);

    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `UPDATE proposal_documents SET status = 'accepted', accepted_at = NOW() WHERE id = $1::uuid AND status = 'sent' RETURNING ${DOCUMENT_COLUMNS}`,
      [id]
    );
    const document = rows[0];
    if (!document) return null;

    if (document.projectId) {
      return { document, projectId: document.projectId, projectCreated: false };
    }

    let title = "Proposal Project";
    if (document.templateId) {
      const template = await this.getTemplate(document.templateId);
      if (template?.name) title = template.name;
    }

    const projectId = await this.insertProject({
      title,
      clientId: document.clientId,
      status: "draft",
      createdBy: document.createdBy,
    });

    const linked = await this.sql.unsafe<ProposalDocumentRow[]>(
      `UPDATE proposal_documents SET project_id = $1::uuid WHERE id = $2::uuid RETURNING ${DOCUMENT_COLUMNS}`,
      [projectId, id]
    );

    return { document: linked[0] ?? document, projectId, projectCreated: true };
  }

  async reject(id: string, reason: string): Promise<ProposalDocumentRow | null> {
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `UPDATE proposal_documents SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1 WHERE id = $2::uuid AND status = 'sent' RETURNING ${DOCUMENT_COLUMNS}`,
      [reason, id]
    );
    return rows[0] ?? null;
  }

  /** Count of open (sent, latest-version) proposals for a client. */
  async countOpenByClient(clientId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int as count FROM proposal_documents pd
       WHERE pd.client_id = $1::uuid AND pd.status = 'sent'
       AND NOT EXISTS (SELECT 1 FROM proposal_documents child WHERE child.parent_document_id = pd.id)`,
      [clientId]
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async getTemplate(templateId: string): Promise<ProposalTemplateRow | null> {
    const rows = await this.sql.unsafe<ProposalTemplateRow[]>(
      `SELECT ${TEMPLATE_COLUMNS} FROM proposal_templates WHERE id = $1::uuid`,
      [templateId]
    );
    return rows[0] ?? null;
  }

  private async insertDocument(data: Record<string, unknown>): Promise<ProposalDocumentRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ProposalDocumentRow[]>(
      `INSERT INTO proposal_documents (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${DOCUMENT_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  private async insertProject(data: Record<string, unknown>): Promise<string> {
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
    const rows = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO projects_freelance (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING id`,
      vals
    );
    return rows[0]!.id;
  }
}
