const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

const supabaseUrl = "https://qghnnvllqcetkyevlywv.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";

async function main() {
  // Use direct postgres.js via the database package
  console.log("Testing DB connection via postgres.js...");
  const postgres = require("postgres");
  const sql = postgres(process.env.DATABASE_URL);
  
  const r = await sql`SELECT 1 as test`;
  console.log("OK:", JSON.stringify(r));
  
  await sql.end();
}

main().catch(e => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
