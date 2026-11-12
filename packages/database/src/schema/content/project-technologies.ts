import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

export const projectTechnologies = pgTable("project_technologies", {
  projectId: uuid("project_id"),
  technologyId: uuid("technology_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.technologyId] }),
}));
