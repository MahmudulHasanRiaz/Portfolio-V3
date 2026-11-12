import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { proposalDocStatus } from "../enums";

export const proposalDocuments = pgTable("proposal_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id"),
  projectId: uuid("project_id"),
  clientId: uuid("client_id"),
  resolvedContent: text("resolved_content"),
  status: proposalDocStatus("status"),
  version: integer("version").notNull().default(1),
  parentDocumentId: uuid("parent_document_id"),
  pdfUrl: text("pdf_url"),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
