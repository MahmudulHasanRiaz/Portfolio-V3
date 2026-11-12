import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { getDb } from "../connection";
import { DatabaseError } from "../errors";

type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, unknown>,
  ExtractTablesWithRelations<Record<string, unknown>>
>;

export async function transaction<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const db = getDb();
  try {
    return await db.transaction(fn);
  } catch (error) {
    throw new DatabaseError("Transaction failed", {
      operation: "transaction",
      cause: error,
    });
  }
}
