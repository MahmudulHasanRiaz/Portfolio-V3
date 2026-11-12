export interface PortalSessionRow {
  id: string;
  projectId: string;
  portalToken: string;
  clientEmail: string | null;
  passwordHash: string | null;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface FreelanceProjectRow {
  id: string;
  title: string | null;
  clientId: string | null;
  categoryId: string | null;
  status: string;
  description: string | null;
  scopeNotes: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  totalAgreedAmount: string | null;
  currency: string | null;
  isPaidProject: boolean | null;
  tags: string[] | null;
  portalAccessEnabled: boolean | null;
  portalToken: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MilestoneRow {
  id: string;
  projectId: string;
  title: string | null;
  description: string | null;
  dueDate: string | null;
  status: string;
  sortOrder: number | null;
  createdAt: string | null;
}

export interface DeliverableRow {
  id: string;
  projectId: string;
  milestoneId: string | null;
  title: string | null;
  fileUrl: string | null;
  notes: string | null;
  status: string;
  clientFeedback: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

export interface ProposalDocumentRow {
  id: string;
  templateId: string | null;
  title: string | null;
  proposalType: string;
  content: string | null;
  fileUrl: string | null;
  version: number;
  status: string;
  clientId: string | null;
  projectId: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string | null;
  sourceType: string;
  sourceId: string | null;
  clientId: string | null;
  lineItems: Record<string, unknown> | null;
  subtotal: string | null;
  discount: string | null;
  total: string | null;
  currency: string | null;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string | null;
}

export interface ActivityLogRow {
  id: string;
  projectId: string;
  actorId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface PortalMessageRow {
  id: string;
  projectId: string;
  senderType: string;
  senderId: string | null;
  message: string;
  attachments: Record<string, unknown> | null;
  isRead: boolean | null;
  createdAt: string | null;
}

export interface ProjectFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectListResponse {
  projects: FreelanceProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeliverableFilters {
  status?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export interface DeliverableListResponse {
  deliverables: DeliverableRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InvoiceFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceListResponse {
  invoices: InvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProposalFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ProposalListResponse {
  proposals: ProposalDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MessageFilters {
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export interface MessageListResponse {
  messages: PortalMessageRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityListResponse {
  activities: ActivityLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PortalAuthResult {
  sessionId: string;
  projectId: string;
  clientEmail: string;
  token: string;
}
