export class ProposalsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ProposalsError";
  }
}

export class TemplateNotFoundError extends ProposalsError {
  constructor(id: string) {
    super(`Proposal template not found: ${id}`, "TEMPLATE_NOT_FOUND");
  }
}

export class TemplateInactiveError extends ProposalsError {
  constructor(id: string) {
    super(
      `Proposal template is inactive and cannot generate documents: ${id}`,
      "TEMPLATE_INACTIVE",
    );
  }
}

export class DocumentNotFoundError extends ProposalsError {
  constructor(id: string) {
    super(`Proposal document not found: ${id}`, "DOCUMENT_NOT_FOUND");
  }
}
