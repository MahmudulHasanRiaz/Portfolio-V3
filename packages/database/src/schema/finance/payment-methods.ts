import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { paymentMethodType } from "../enums";

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }),
  type: paymentMethodType("type"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
