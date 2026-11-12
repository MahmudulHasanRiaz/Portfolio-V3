import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

export const ventureProducts = pgTable("venture_products", {
  ventureId: uuid("venture_id"),
  productId: uuid("product_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.ventureId, table.productId] }),
}));
