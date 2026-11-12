import { getDb, getSql, closeDb } from "./connection";
import { DatabaseError, NotFoundError, ConstraintViolationError } from "./errors";
import { getDatabaseConfig } from "./config";
import { transaction } from "./utils/transaction";

export * from "./schema/index";
export * from "./types/index";

export { SearchIndexerService } from "./services/search-indexer";
export { SearchIndexRepository } from "./repository/search";
export { SettingsRepository } from "./repository/system";
export {
  getDb,
  getSql,
  closeDb,
  getDatabaseConfig,
  DatabaseError,
  NotFoundError,
  ConstraintViolationError,
  transaction,
};
