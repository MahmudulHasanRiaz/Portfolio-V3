import postgres from "postgres";
import { getDatabaseConfig } from "./config";

const config = getDatabaseConfig();
const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  for (const t of tables) console.log(t.table_name);
  await sql.end();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
