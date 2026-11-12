import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedSettings(db: PostgresJsDatabase<typeof schema>) {
  await db.insert(schema.settings).values([
    {
      key: "site_name",
      value: "Personal Brand OS",
      group: "general",
      description: "The name of the site as displayed in the browser tab and header",
    },
    {
      key: "site_description",
      value: "A comprehensive personal brand management platform for creative professionals",
      group: "general",
      description: "Default meta description for the site",
    },
    {
      key: "contact_email",
      value: "hello@example.com",
      group: "contact",
      description: "Primary contact email address for inquiries",
    },
    {
      key: "social_links",
      value: {
        github: "https://github.com/example",
        linkedin: "https://linkedin.com/in/example",
        twitter: "https://twitter.com/example",
        youtube: "https://youtube.com/@example",
      },
      group: "social",
      description: "Social media profile URLs",
    },
    {
      key: "timezone",
      value: "Asia/Dhaka",
      group: "regional",
      description: "Default timezone for the site",
    },
    {
      key: "locale",
      value: "en",
      group: "regional",
      description: "Default locale setting",
    },
    {
      key: "maintenance_mode",
      value: false,
      group: "system",
      description: "When enabled, the site displays a maintenance page to visitors",
    },
  ]);

  console.log("Seeded 7 system settings");
}
