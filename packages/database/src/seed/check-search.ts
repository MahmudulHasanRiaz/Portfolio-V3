import postgres from "postgres";
import { getDatabaseConfig } from "../config";

const config = getDatabaseConfig();
const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const entries = await sql`SELECT id, entity_type, title, content_type, url FROM search_index LIMIT 20`;
  console.log("search_index entries:", entries.length);
  for (const e of entries) console.log(`  ${e.entity_type}: "${e.title.substring(0, 40)}" type=${e.content_type} url=${e.url}`);

  // Try the actual search query
  console.log("\nSearching for 'Kal':");
  const results = await sql`SELECT entity_type, title, content_type, url FROM search_index WHERE title ILIKE '%Kal%' OR content ILIKE '%Kal%' OR summary ILIKE '%Kal%' ORDER BY published_at DESC NULLS LAST LIMIT 20`;
  console.log("results:", results.length);
  for (const r of results) console.log(`  ${r.entity_type}: ${r.title} (${r.content_type})`);

  console.log("\nSearching for 'web':");
  const webResults = await sql`SELECT entity_type, title, content_type, url FROM search_index WHERE title ILIKE '%web%' OR content ILIKE '%web%' OR summary ILIKE '%web%' ORDER BY published_at DESC NULLS LAST LIMIT 20`;
  console.log("results:", webResults.length);
  for (const r of webResults) console.log(`  ${r.entity_type}: ${r.title.substring(0, 50)} (${r.content_type})`);

  await sql.end();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
