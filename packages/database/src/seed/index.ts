import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { getDatabaseConfig } from "../config";
import { seedIdentity } from "./identity";
import { seedContent } from "./content";
import { seedEntrepreneur } from "./entrepreneur";
import { seedArtist } from "./artist";
import { seedCrm } from "./crm";
import { seedFreelance } from "./freelance";
import { seedEvents } from "./events";
import { seedFinance } from "./finance";
import { seedSettings } from "./settings";

async function main() {
  const config = getDatabaseConfig();
  const poolClient = postgres(config.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(poolClient, { schema });

  console.log("Seeding database...");

  await seedIdentity(db);
  await seedContent(db);
  await seedEntrepreneur(db);
  await seedArtist(db);
  await seedCrm(db);
  await seedFreelance(db);
  await seedEvents(db);
  await seedFinance(db);
  await seedSettings(db);

  console.log("Seeding complete.");
  await poolClient.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
