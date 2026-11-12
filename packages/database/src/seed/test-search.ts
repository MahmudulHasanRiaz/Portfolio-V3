import postgres from "postgres";
import { getDatabaseConfig } from "../config";

const config = getDatabaseConfig();
const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const query = "web";
  const searchTerm = `%${query}%`;

  // Match the exact query the API uses (minus the isNull filter)
  const results = await sql`
    SELECT id, entity_type, entity_id, title, content, url
    FROM search_index
    WHERE title ILIKE ${searchTerm}
       OR content ILIKE ${searchTerm}
       OR summary ILIKE ${searchTerm}
    ORDER BY published_at DESC NULLS LAST
    LIMIT 20
  `;

  const items = results.map(r => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    title: r.title,
    content: r.content,
    url: r.url,
  }));

  console.log(JSON.stringify({ items, total: items.length }, null, 2));

  await sql.end();
}

main().catch((error) => {
  console.error(JSON.stringify({ items: [], total: 0, error: error.message }));
  process.exit(1);
});
