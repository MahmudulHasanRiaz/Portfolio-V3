import postgres from "postgres";
import { getDatabaseConfig } from "../config";

const config = getDatabaseConfig();
const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const checks = [
    ["person_profiles", "SELECT id, full_name, headline FROM person_profiles"],
    ["homepage_sections", "SELECT id, section_key, is_visible, sort_order FROM homepage_sections ORDER BY sort_order"],
    ["posts", "SELECT id, title, slug, status FROM posts WHERE status = 'published'"],
    ["services", "SELECT id, title, slug, status FROM services WHERE status = 'published'"],
    ["projects", "SELECT id, title, slug, status FROM projects WHERE status = 'published'"],
    ["ventures", "SELECT id, name, slug, content_status FROM ventures WHERE content_status = 'published'"],
    ["releases", "SELECT id, title, slug, status FROM releases WHERE status = 'published'"],
    ["case_studies", "SELECT id, title, slug, status FROM case_studies WHERE status = 'published'"],
    ["pages", "SELECT id, title, slug, status FROM pages"],
    ["search_index", "SELECT COUNT(*) as cnt FROM search_index"],
    ["faqs", "SELECT id, question FROM faqs LIMIT 5"],
    ["testimonials", "SELECT id, author_name FROM testimonials LIMIT 5"],
  ];

  for (const [name, query] of checks) {
    try {
      const result = await sql.unsafe(query);
      console.log(`${name}: ${result.length} rows`);
      for (const row of result) console.log(`  ${JSON.stringify(row)}`);
    } catch (e) {
      console.log(`${name}: ERROR - ${e.message}`);
    }
  }

  await sql.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Check failed:", error);
  process.exit(1);
});
