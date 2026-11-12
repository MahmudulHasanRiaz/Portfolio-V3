import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedFreelance(db: PostgresJsDatabase<typeof schema>) {
  const category = await db.insert(schema.projectCategories).values({
    name: "Web Development",
    slug: "web-development",
    description: "Full-stack web application development projects",
    color: "#3B82F6",
    icon: "globe",
  }).returning();

  const project = await db.insert(schema.projectsFreelance).values({
    title: "Restaurant Booking System",
    categoryId: category[0]!.id,
    status: "in_progress",
    description: "Build a comprehensive restaurant reservation and table management system with online booking, waitlist management, and staff dashboard.",
    scopeNotes: "Includes: online booking widget with real-time availability, admin dashboard for table management, SMS/email confirmations, customer profile management, and integration with Google Calendar for staff scheduling.",
    startDate: "2026-05-01",
    expectedEndDate: "2026-07-15",
    totalAgreedAmount: "18000",
    currency: "USD",
    isPaidProject: true,
    tags: ["react", "node", "postgresql"],
    portalAccessEnabled: true,
    portalToken: "portal_restaurant_abc123",
  }).returning();

  const milestones = await db.insert(schema.projectMilestones).values([
    {
      projectId: project[0]!.id,
      title: "Database Schema & API Design",
      description: "Design database schema for restaurants, tables, reservations, and customers. Implement RESTful API endpoints.",
      dueDate: "2026-05-15",
      status: "completed",
      sortOrder: 1,
    },
    {
      projectId: project[0]!.id,
      title: "Online Booking Widget",
      description: "Build embeddable booking widget with date/time picker, party size selector, and real-time availability checking.",
      dueDate: "2026-06-01",
      status: "in_progress",
      sortOrder: 2,
    },
    {
      projectId: project[0]!.id,
      title: "Admin Dashboard",
      description: "Create admin interface for table management, reservation overview, waitlist management, and staff scheduling.",
      dueDate: "2026-06-20",
      status: "pending",
      sortOrder: 3,
    },
    {
      projectId: project[0]!.id,
      title: "Integration & Testing",
      description: "Integrate SMS/email notifications, set up Google Calendar sync, perform end-to-end testing, and deploy to production.",
      dueDate: "2026-07-10",
      status: "pending",
      sortOrder: 4,
    },
  ]).returning();

  await db.insert(schema.projectDeliverables).values([
    {
      projectId: project[0]!.id,
      milestoneId: milestones[0]!.id,
      title: "Database Schema Documentation",
      fileUrl: "/files/schema-diagram.pdf",
      notes: "Complete ERD diagram with all table relationships and indexes documented.",
      status: "approved",
      submittedAt: new Date("2026-05-14"),
      approvedAt: new Date("2026-05-16"),
      clientFeedback: "Looks comprehensive. Approved.",
    },
    {
      projectId: project[0]!.id,
      milestoneId: milestones[0]!.id,
      title: "API Endpoint Collection",
      fileUrl: "/files/api-collection.json",
      notes: "Postman collection with all REST endpoints, request/response examples, and authentication flows.",
      status: "approved",
      submittedAt: new Date("2026-05-14"),
      approvedAt: new Date("2026-05-16"),
      clientFeedback: "Tested all endpoints. Everything works as expected.",
    },
  ]);

  console.log(`Seeded ${project.length} freelance project with milestones and deliverables`);
}
