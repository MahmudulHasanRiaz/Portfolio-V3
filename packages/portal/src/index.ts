import postgres from "postgres";
import { PortalAuthRepository } from "./portal-auth-repository";
import { ProjectRepository } from "./project-repository";
import { MilestoneRepository } from "./milestone-repository";
import { DeliverableRepository } from "./deliverable-repository";
import { ProposalRepository } from "./proposal-repository";
import { MessageRepository } from "./message-repository";
import { ActivityRepository } from "./activity-repository";
import { InvoiceRepository } from "./invoice-repository";

export { PortalAuthRepository } from "./portal-auth-repository";
export { ProjectRepository } from "./project-repository";
export { MilestoneRepository } from "./milestone-repository";
export { DeliverableRepository } from "./deliverable-repository";
export { ProposalRepository } from "./proposal-repository";
export { MessageRepository } from "./message-repository";
export { ActivityRepository } from "./activity-repository";
export { InvoiceRepository } from "./invoice-repository";
export { PortalError, AuthError, NotFoundError, AccessDeniedError } from "./errors";
export type * from "./types";

export function createPortalRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    auth: new PortalAuthRepository(sql),
    projects: new ProjectRepository(sql),
    milestones: new MilestoneRepository(sql),
    deliverables: new DeliverableRepository(sql),
    proposals: new ProposalRepository(sql),
    messages: new MessageRepository(sql),
    activities: new ActivityRepository(sql),
    invoices: new InvoiceRepository(sql),
    close: () => sql.end(),
  };
}
