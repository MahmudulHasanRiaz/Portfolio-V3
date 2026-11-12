import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { ventures } from "./ventures";
import { ventureCategories } from "./venture-categories";

export const ventureCategoryAssignments = pgTable("venture_category_assignments", {
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => ventures.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => ventureCategories.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.ventureId, table.categoryId] }),
}));
