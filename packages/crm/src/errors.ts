export class CrmError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "CrmError";
  }
}

export class LeadNotFoundError extends CrmError {
  constructor(id: string) {
    super(`Lead not found: ${id}`, "LEAD_NOT_FOUND");
  }
}
