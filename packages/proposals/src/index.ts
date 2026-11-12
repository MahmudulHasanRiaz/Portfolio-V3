import postgres from "postgres";
import { ProposalTemplateRepository } from "./template-repository";
import { ProposalDocumentRepository } from "./document-repository";

export { ProposalTemplateRepository } from "./template-repository";
export { ProposalDocumentRepository, substituteVariables } from "./document-repository";
export { ProposalsError, TemplateNotFoundError, TemplateInactiveError, DocumentNotFoundError } from "./errors";
export type {
  ProposalTemplateFilters,
  ProposalTemplateRow,
  ProposalTemplateListResponse,
  ProposalDocumentFilters,
  ProposalDocumentRow,
  ProposalDocumentListResponse,
  GenerateDocumentInput,
  CreateVersionInput,
  AcceptDocumentResult,
} from "./types";

export function createProposalsRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    templates: new ProposalTemplateRepository(sql),
    documents: new ProposalDocumentRepository(sql),
    close: () => sql.end(),
  };
}
