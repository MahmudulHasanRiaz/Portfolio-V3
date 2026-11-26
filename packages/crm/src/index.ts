import postgres from "postgres";
import { LeadRepository } from "./lead-repository";
import { ActivityRepository } from "./activity-repository";
import { NoteRepository } from "./note-repository";
import { AbandonedRepository } from "./abandoned-repository";


export function createCrmRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    leads: new LeadRepository(sql),
    activities: new ActivityRepository(sql),
    notes: new NoteRepository(sql),
    abandoned: new AbandonedRepository(sql),
  };
}
