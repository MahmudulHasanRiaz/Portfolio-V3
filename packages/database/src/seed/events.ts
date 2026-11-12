import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedEvents(db: PostgresJsDatabase<typeof schema>) {
  const categories = await db.insert(schema.eventCategories).values([
    {
      name: "Concert",
      slug: "concert",
      description: "Live musical performances and concerts",
      color: "#8B5CF6",
      icon: "music",
    },
    {
      name: "Conference",
      slug: "conference",
      description: "Professional conferences and industry events",
      color: "#10B981",
      icon: "users",
    },
  ]).returning();

  await db.insert(schema.artistEvents).values([
    {
      title: "Islamic Arts Festival 2026",
      categoryId: categories[0]!.id,
      organizerName: "Islamic Cultural Center",
      organizerContact: "info@icc.example.com",
      eventDate: "2026-08-15",
      eventTime: "19:00:00",
      durationMinutes: 180,
      venueName: "Bangabandhu International Conference Center",
      venueAddress: "Agargaon, Sher-E-Bangla Nagar",
      city: "Dhaka",
      country: "Bangladesh",
      status: "confirmed",
      isPaid: true,
      agreedFee: "5000",
      currency: "USD",
      notes: "Headline performance. Expected audience of 2,000+.",
      isPublic: true,
    },
    {
      title: "Tech Entrepreneurs Summit 2026",
      categoryId: categories[1]!.id,
      organizerName: "Bangladesh Tech Association",
      organizerContact: "events@bta.example.com",
      eventDate: "2026-09-20",
      eventTime: "09:00:00",
      durationMinutes: 480,
      venueName: "Pan Pacific Sonargaon Dhaka",
      venueAddress: "107 Kazi Nazrul Islam Avenue",
      city: "Dhaka",
      country: "Bangladesh",
      status: "confirmed",
      isPaid: false,
      notes: "Panel discussion on digital transformation in emerging markets.",
      isPublic: true,
    },
  ]);

  console.log(`Seeded ${categories.length} event categories, 2 events`);
}
