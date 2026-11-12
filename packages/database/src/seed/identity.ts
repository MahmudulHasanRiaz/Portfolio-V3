import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

// Idempotent: every insert uses ON CONFLICT DO NOTHING and rows are
// re-read afterwards, so this is safe to re-run on a fresh, partial or
// fully seeded database (e.g. production, where the admin user may
// already exist from db:create-user).
export async function seedIdentity(db: PostgresJsDatabase<typeof schema>) {
  await db.insert(schema.permissions).values([
    { name: "users.create", description: "Create new users", group: "users" },
    { name: "users.read", description: "View user details", group: "users" },
    { name: "users.update", description: "Update user information", group: "users" },
    { name: "users.delete", description: "Delete users", group: "users" },
    { name: "users.manage_roles", description: "Manage user role assignments", group: "users" },
    { name: "users.manage", description: "Full user management access", group: "users" },
    { name: "content.create", description: "Create content items", group: "content" },
    { name: "content.read", description: "View content items", group: "content" },
    { name: "content.update", description: "Update content items", group: "content" },
    { name: "content.delete", description: "Delete content items", group: "content" },
    { name: "content.publish", description: "Publish content items", group: "content" },
    { name: "content.schedule", description: "Schedule content publishing", group: "content" },
    { name: "content.manage", description: "Full content management access", group: "content" },
    { name: "content.manage_seo", description: "Manage SEO metadata for content", group: "content" },
    { name: "services.create", description: "Create services", group: "services" },
    { name: "services.read", description: "View services", group: "services" },
    { name: "services.update", description: "Update services", group: "services" },
    { name: "services.delete", description: "Delete services", group: "services" },
    { name: "projects.create", description: "Create projects", group: "projects" },
    { name: "projects.read", description: "View projects", group: "projects" },
    { name: "projects.update", description: "Update projects", group: "projects" },
    { name: "projects.delete", description: "Delete projects", group: "projects" },
    { name: "blog.create", description: "Create blog posts", group: "blog" },
    { name: "blog.read", description: "View blog posts", group: "blog" },
    { name: "blog.update", description: "Update blog posts", group: "blog" },
    { name: "blog.delete", description: "Delete blog posts", group: "blog" },
    { name: "media.upload", description: "Upload media files", group: "media" },
    { name: "media.read", description: "View media files", group: "media" },
    { name: "media.update", description: "Update media metadata", group: "media" },
    { name: "media.delete", description: "Delete media files", group: "media" },
    { name: "crm.read", description: "View CRM leads and data", group: "crm" },
    { name: "crm.update", description: "Update CRM records", group: "crm" },
    { name: "crm.delete", description: "Delete CRM records", group: "crm" },
    { name: "crm.export", description: "Export CRM data", group: "crm" },
    { name: "crm.manage", description: "Full CRM management access", group: "crm" },
    { name: "finance.read", description: "View financial records", group: "finance" },
    { name: "finance.create", description: "Create financial records", group: "finance" },
    { name: "finance.update", description: "Update financial records", group: "finance" },
    { name: "finance.delete", description: "Delete financial records", group: "finance" },
    { name: "freelance.create", description: "Create freelance projects", group: "freelance" },
    { name: "freelance.read", description: "View freelance projects", group: "freelance" },
    { name: "freelance.update", description: "Update freelance projects", group: "freelance" },
    { name: "freelance.delete", description: "Delete freelance projects", group: "freelance" },
    { name: "events.create", description: "Create events", group: "events" },
    { name: "events.read", description: "View events", group: "events" },
    { name: "events.update", description: "Update events", group: "events" },
    { name: "events.delete", description: "Delete events", group: "events" },
    { name: "portal.access", description: "Access client portal", group: "portal" },
    { name: "portal.message", description: "Send messages via portal", group: "portal" },
    { name: "portal.manage", description: "Manage portal settings", group: "portal" },
    { name: "news.manage", description: "Manage news and announcements", group: "news" },
    { name: "news.export", description: "Export news data", group: "news" },
    { name: "system.read", description: "View system configuration", group: "system" },
    { name: "system.update", description: "Update system settings", group: "system" },
    { name: "system.manage", description: "Full system management access", group: "system" },
    { name: "system.audit", description: "View audit logs", group: "system" },
  ]).onConflictDoNothing({ target: schema.permissions.name }).returning();

  const permissions = await db.select().from(schema.permissions);

  const insertedAdmin = await db.insert(schema.users).values({
    email: "admin@example.com",
    name: "Admin",
    isActive: true,
  }).onConflictDoNothing({ target: schema.users.email }).returning() as unknown as { id: string }[];
  const admin = insertedAdmin[0] ??
    (await db.select().from(schema.users).where(eq(schema.users.email, "admin@example.com")))[0]!;

  await db.insert(schema.roles).values([
    {
      name: "Super Admin",
      description: "Unrestricted access to all system features",
      isSystem: true,
    },
    {
      name: "Admin",
      description: "Administrative access with nearly all permissions",
      isSystem: true,
    },
    {
      name: "Content Manager",
      description: "Manages content, services, projects, blog, media, and SEO",
      isSystem: false,
    },
    {
      name: "Editor",
      description: "Read and write access to content and blog",
      isSystem: false,
    },
    {
      name: "CRM Manager",
      description: "Manages leads, forms, and finance records",
      isSystem: false,
    },
    {
      name: "Freelance Manager",
      description: "Manages freelance projects, proposals, and client portal",
      isSystem: false,
    },
    {
      name: "Event Manager",
      description: "Manages events and artist bookings",
      isSystem: false,
    },
    {
      name: "Finance Manager",
      description: "Read and write access to financial records",
      isSystem: false,
    },
    {
      name: "Viewer",
      description: "Read-only access to content and projects",
      isSystem: false,
    },
    {
      name: "Client",
      description: "Limited portal-only access for clients",
      isSystem: false,
    },
  ]).onConflictDoNothing({ target: schema.roles.name }).returning();

  const roles = await db.select().from(schema.roles);

  const superAdminRole = roles.find(r => r.name === "Super Admin")!;
  const adminRole = roles.find(r => r.name === "Admin")!;
  const contentMgrRole = roles.find(r => r.name === "Content Manager")!;
  const editorRole = roles.find(r => r.name === "Editor")!;
  const crmMgrRole = roles.find(r => r.name === "CRM Manager")!;
  const freelanceMgrRole = roles.find(r => r.name === "Freelance Manager")!;
  const eventMgrRole = roles.find(r => r.name === "Event Manager")!;
  const financeMgrRole = roles.find(r => r.name === "Finance Manager")!;
  const viewerRole = roles.find(r => r.name === "Viewer")!;
  const clientRole = roles.find(r => r.name === "Client")!;

  const findPerm = (name: string) =>
    permissions.find(p => p.name === name)!;

  const userPerms = ["users.create", "users.read", "users.update", "users.delete", "users.manage_roles", "users.manage"] as const;
  const contentPerms = ["content.create", "content.read", "content.update", "content.delete", "content.publish", "content.schedule", "content.manage", "content.manage_seo"] as const;
  const servicesPerms = ["services.create", "services.read", "services.update", "services.delete"] as const;
  const projectsPerms = ["projects.create", "projects.read", "projects.update", "projects.delete"] as const;
  const blogPerms = ["blog.create", "blog.read", "blog.update", "blog.delete"] as const;
  const mediaPerms = ["media.upload", "media.read", "media.update", "media.delete"] as const;
  const crmPerms = ["crm.read", "crm.update", "crm.delete", "crm.export", "crm.manage"] as const;
  const financePerms = ["finance.read", "finance.create", "finance.update", "finance.delete"] as const;
  const freelancePerms = ["freelance.create", "freelance.read", "freelance.update", "freelance.delete"] as const;
  const eventsPerms = ["events.create", "events.read", "events.update", "events.delete"] as const;
  const portalPerms = ["portal.access", "portal.message", "portal.manage"] as const;
  const newsPerms = ["news.manage", "news.export"] as const;
  const systemPerms = ["system.read", "system.update", "system.manage", "system.audit"] as const;

  const allPermNames = [...userPerms, ...contentPerms, ...servicesPerms, ...projectsPerms, ...blogPerms, ...mediaPerms, ...crmPerms, ...financePerms, ...freelancePerms, ...eventsPerms, ...portalPerms, ...newsPerms, ...systemPerms];

  const rolePerms: { roleId: string; permissionId: string }[] = [];

  for (const name of allPermNames) {
    rolePerms.push({ roleId: superAdminRole.id, permissionId: findPerm(name).id });
  }
  for (const name of allPermNames) {
    if (name !== "system.audit") {
      rolePerms.push({ roleId: adminRole.id, permissionId: findPerm(name).id });
    }
  }
  for (const name of contentPerms) {
    rolePerms.push({ roleId: contentMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of servicesPerms) {
    rolePerms.push({ roleId: contentMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of projectsPerms) {
    rolePerms.push({ roleId: contentMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of blogPerms) {
    rolePerms.push({ roleId: contentMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of mediaPerms) {
    rolePerms.push({ roleId: contentMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of blogPerms) {
    rolePerms.push({ roleId: editorRole.id, permissionId: findPerm(name).id });
  }
  rolePerms.push({ roleId: editorRole.id, permissionId: findPerm("content.read").id });
  rolePerms.push({ roleId: editorRole.id, permissionId: findPerm("content.create").id });
  rolePerms.push({ roleId: editorRole.id, permissionId: findPerm("content.update").id });
  for (const name of crmPerms) {
    rolePerms.push({ roleId: crmMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of financePerms) {
    rolePerms.push({ roleId: crmMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of freelancePerms) {
    rolePerms.push({ roleId: freelanceMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of portalPerms) {
    rolePerms.push({ roleId: freelanceMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of eventsPerms) {
    rolePerms.push({ roleId: eventMgrRole.id, permissionId: findPerm(name).id });
  }
  for (const name of financePerms) {
    rolePerms.push({ roleId: financeMgrRole.id, permissionId: findPerm(name).id });
  }
  rolePerms.push({ roleId: viewerRole.id, permissionId: findPerm("content.read").id });
  rolePerms.push({ roleId: viewerRole.id, permissionId: findPerm("services.read").id });
  rolePerms.push({ roleId: viewerRole.id, permissionId: findPerm("projects.read").id });
  rolePerms.push({ roleId: viewerRole.id, permissionId: findPerm("blog.read").id });
  rolePerms.push({ roleId: viewerRole.id, permissionId: findPerm("media.read").id });
  rolePerms.push({ roleId: clientRole.id, permissionId: findPerm("portal.access").id });
  rolePerms.push({ roleId: clientRole.id, permissionId: findPerm("portal.message").id });

  await db.insert(schema.rolePermissions).values(rolePerms).onConflictDoNothing();

  await db.insert(schema.userRoles).values({
    userId: admin.id,
    roleId: superAdminRole.id,
  }).onConflictDoNothing();

  console.log(`Seeded ${permissions.length} permissions, ${roles.length} roles, 1 admin user`);
}
