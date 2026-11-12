import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { getDatabaseConfig } from "../config";
import { seedIdentity } from "./identity";

// Production-safe bootstrap: seeds ONLY roles, permissions and their
// mappings (no demo content). The full db:seed also inserts sample
// content/CRM/finance rows and must not run against production.
// Idempotent (ON CONFLICT DO NOTHING throughout seedIdentity), so it is
// safe to re-run, including after a partial run. Afterwards, re-running
// db:create-user assigns the Super Admin role to the existing admin.
async function main() {
  const config = getDatabaseConfig();
  const poolClient = postgres(config.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(poolClient, { schema });

  console.log("Seeding identity (roles & permissions)...");
  await seedIdentity(db);
  console.log("Identity seeding complete.");
  await poolClient.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Identity seeding failed:", error);
  process.exit(1);
});
