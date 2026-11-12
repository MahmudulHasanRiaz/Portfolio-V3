import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { roles } from "./roles";

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);
