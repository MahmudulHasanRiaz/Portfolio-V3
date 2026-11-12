// Row types mirror the Drizzle schemas in
// packages/database/src/schema/proposals/*.ts column-for-column (camelCase).
// Timestamps are typed `string` following the same convention as
// @repo/crm and @repo/finance.

export interface ProposalTemplateFilters {
  type?: string;
  clientType?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProposalTemplateListResponse {
  templates: ProposalTemplateRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProposalTemplateRow {
  id: string;
  name: string | null;
  projectCategoryId: string | null;
  clientType: string | null;
  type: string | null;
  content: string | null;
  variables: Record<string, unknown> | null;
  isActive: boolean | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface ProposalDocumentFilters {
  clientId?: string;
  projectId?: string;
  templateId?: string;
  status?: string | string[];
  latestOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProposalDocumentListResponse {
  documents: ProposalDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProposalDocumentRow {
  id: string;
  templateId: string | null;
  projectId: string | null;
  clientId: string | null;
  resolvedContent: string | null;
  status: string | null;
  version: number;
  parentDocumentId: string | null;
  pdfUrl: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface GenerateDocumentInput {
  templateId: string;
  projectId?: string | null;
  clientId?: string | null;
  variables: Record<string, string>;
  createdBy?: string | null;
}

export interface CreateVersionInput {
  variables?: Record<string, string>;
  resolvedContent?: string;
}

export interface AcceptDocumentResult {
  document: ProposalDocumentRow;
  projectId: string | null;
  projectCreated: boolean;
}
