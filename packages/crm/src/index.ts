import postgres from "postgres";
import { LeadRepository } from "./lead-repository";
import { ActivityRepository } from "./activity-repository";
import { NoteRepository } from "./note-repository";
import { AbandonedRepository } from "./abandoned-repository";

export { LeadRepository } from "./lead-repository";
export { ActivityRepository } from "./activity-repository";
export { NoteRepository } from "./note-repository";
export { AbandonedRepository } from "./abandoned-repository";
export { LeadNotFoundError, CrmError } from "./errors";
export type { LeadFilters, LeadRow, LeadListResponse } from "./types";
export type { ActivityRow } from "./activity-repository";
export type { NoteRow } from "./note-repository";
export type { AbandonedLeadRow } from "./abandoned-repository";

export function createCrmRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    leads: new LeadRepository(sql),
    activities: new ActivityRepository(sql),
    notes: new NoteRepository(sql),
    abandoned: new AbandonedRepository(sql),
  };
}
