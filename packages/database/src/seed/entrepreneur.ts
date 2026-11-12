import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedEntrepreneur(db: PostgresJsDatabase<typeof schema>) {
  const venture = await db.insert(schema.ventures).values({
    name: "TechVentures Inc.",
    slug: "techventures-inc",
    description: "A technology holding company building software tools that empower small and medium businesses to compete in the digital economy.",
    logo: "/images/ventures/techventures-logo.png",
    website: "https://techventures.example.com",
    foundedDate: "2024-01-15",
    status: "active",
    isFeatured: true,
    keywords: "technology, startups, SaaS, B2B, software",
  }).returning();

  const products = await db.insert(schema.products).values([
    {
      name: "CloudSight Analytics",
      slug: "cloudsight-analytics",
      ventureId: venture[0]!.id,
      description: "Real-time business intelligence platform that transforms raw data into actionable insights. Features customizable dashboards, automated reporting, and AI-powered trend detection.",
      launchDate: "2024-06-01",
      url: "https://cloudsight.example.com",
      status: "active",
      isFeatured: true,
    },
    {
      name: "DevFlow",
      slug: "devflow",
      ventureId: venture[0]!.id,
      description: "Streamlined project management and collaboration tool built for remote engineering teams. Integrates with GitHub, Slack, and Jira to provide a unified view of development workflows.",
      launchDate: "2024-09-15",
      url: "https://devflow.example.com",
      status: "active",
      isFeatured: true,
    },
  ]).returning();

  await db.insert(schema.ventureProducts).values([
    { ventureId: venture[0]!.id, productId: products[0]!.id },
    { ventureId: venture[0]!.id, productId: products[1]!.id },
  ]);

  console.log(`Seeded ${venture.length} venture, ${products.length} products`);
}
