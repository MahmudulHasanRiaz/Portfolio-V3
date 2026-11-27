// Portal (client) helpers — shared by the Hono portal routes.
//
// Identity: portal clients are Better Auth users (ba_user, email =
// portal_sessions.client_email). The portal_session_token cookie, the JWT
// and the bcryptjs login are retired; see routes/portal/auth.ts.
import type { Context } from "hono";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getApiDb, type ApiDb } from "../../db";
import { getAuth, getSessionUser } from "../../auth";
import {
  baUser,
  clients,
  financeInvoices,
  portalMessages,
  portalSessions,
  projectActivityLogs,
  projectDeliverables,
  proposalDocuments,
  proposalTemplates,
  projectsFreelance,
} from "@repo/database/schema";
import { uuidSchema } from "@repo/validation";

/**
 * Log a portal error server-side and return a generic client-facing
 * message. Never return a DB/driver error to the client: Neon wraps a
 * failed query as "Failed query: <SQL>\nparams: <values>", so returning
 * err.message leaks table/column names and submitted values.
 */
export function portalError(err: unknown, fallback: string): string {
  console.error("[Portal API] Error:", err);
  return fallback;
}

/** Parse a JSON request body; null when the body is absent or invalid. */
export async function readJsonBody(
  c: Context,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await c.req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delegate a request to the Better Auth handler (mounted on this same Hono
 * app at /api/auth/*) and return its Response untouched, so Set-Cookie
 * headers flow through to the browser.
 */
export async function delegateToBetterAuth(
  c: Context,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = new URL(path, c.req.url);
  const headers = new Headers(c.req.raw.headers);
  headers.set("content-type", "application/json");
  const req = new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return (await getAuth()).handler(req);
}

/** Display name for a client (used as the Better Auth user name). */
export async function resolveClientName(
  db: ApiDb,
  clientId: string,
): Promise<string> {
  // A null/empty clientId must never reach the uuid column (Postgres
  // throws and the driver wraps the SQL in the error).
  if (!uuidSchema.safeParse(clientId).success) return "Client";
  const [row] = await db
    .select({ name: clients.name })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row?.name ?? "Client";
}

/** Insert a row into project_activity_logs (actor is null for client actions). */
export async function logActivity(
  db: ApiDb,
  projectId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(projectActivityLogs).values({
    projectId,
    actorId: null,
    action,
    metadata: metadata ?? null,
  });
}

/** Stamp a portal session's last_accessed_at (best effort — never throws). */
export async function updateLastAccessed(
  db: ApiDb,
  sessionId: string,
): Promise<void> {
  try {
    await db
      .update(portalSessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(portalSessions.id, sessionId));
  } catch {
    // Access tracking must never fail a login/setup.
  }
}

export interface PortalClient {
  email: string;
  clientId: string;
  projectId: string;
}

/**
 * Resolve the signed-in Better Auth user to a portal client: the earliest
 * portal_sessions row for the user's email anchors the client (clientId)
 * and the project that identity is tied to. The anchor project must have
 * portal access enabled, otherwise the client has no portal identity.
 */
export async function requirePortalClient(
  c: Context,
): Promise<PortalClient | null> {
  const user = await getSessionUser(c.req.raw.headers);
  if (!user?.email) return null;
  const db = getApiDb();
  const sessions = await db
    .select()
    .from(portalSessions)
    .where(sql`lower(${portalSessions.clientEmail}) = lower(${user.email})`)
    .orderBy(asc(portalSessions.createdAt))
    .limit(1);
  const anchor = sessions[0];
  if (!anchor?.projectId) return null;
  const [project] = await db
    .select()
    .from(projectsFreelance)
    .where(eq(projectsFreelance.id, anchor.projectId))
    .limit(1);
  if (!project?.clientId || !project.portalAccessEnabled) return null;
  return { email: user.email, clientId: project.clientId, projectId: anchor.projectId };
}

/** The ids of all portal-enabled projects belonging to a client. */
export async function getClientProjectIds(
  db: ApiDb,
  clientId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: projectsFreelance.id })
    .from(projectsFreelance)
    .where(
      and(
        eq(projectsFreelance.clientId, clientId),
        eq(projectsFreelance.portalAccessEnabled, true),
      ),
    );
  return rows.map((r) => r.id);
}

/**
 * A single portal-enabled project of the client, or null. Used by the
 * per-project routes (activities, milestones, deliverables, messages).
 */
export async function getClientProject(
  db: ApiDb,
  id: string,
  clientId: string,
) {
  // A non-UUID id must never reach the uuid column (Postgres throws and
  // the driver wraps the SQL in the error) — treat it as "not found",
  // exactly like the uuidParam guard on the detail routes.
  if (!uuidSchema.safeParse(id).success) return null;
  const [project] = await db
    .select()
    .from(projectsFreelance)
    .where(
      and(
        eq(projectsFreelance.id, id),
        eq(projectsFreelance.clientId, clientId),
        eq(projectsFreelance.portalAccessEnabled, true),
      ),
    )
    .limit(1);
  return project ?? null;
}

/** Find a ba_user row by email, case-insensitive. */
export async function findBaUserByEmail(db: ApiDb, email: string) {
  const [row] = await db
    .select()
    .from(baUser)
    .where(sql`lower(${baUser.email}) = lower(${email})`)
    .limit(1);
  return row ?? null;
}

export interface PortalSearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  summary: string;
  url: string;
  thumbnail: string;
  publishedAt: string | null;
  contentType: string | null;
  headline: string;
}

/**
 * Portal search — scoped to the client's own data only. (The old Next.js
 * route searched the public FTS index and filtered on a `clientId` the
 * index rows never had, and it called a `search()` method that does not
 * exist, so it 500'd. The public index cannot be scoped to a client, so
 * the portal searches the client's projects, deliverables, proposals,
 * invoices and messages instead.)
 */
export async function portalSearch(
  db: ApiDb,
  clientId: string,
  query: string,
  page: number,
  pageSize: number,
): Promise<{ results: PortalSearchResult[]; total: number }> {
  const q = `%${query}%`;
  const projectIds = await getClientProjectIds(db, clientId);
  const results: PortalSearchResult[] = [];
  const snippet = (text: string | null | undefined) =>
    (text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

  // Projects.
  const projects = await db
    .select()
    .from(projectsFreelance)
    .where(
      and(
        eq(projectsFreelance.clientId, clientId),
        eq(projectsFreelance.portalAccessEnabled, true),
        or(
          ilike(projectsFreelance.title, q),
          ilike(projectsFreelance.description, q),
          ilike(projectsFreelance.scopeNotes, q),
        ),
      ),
    )
    .orderBy(desc(projectsFreelance.createdAt));
  for (const p of projects) {
    results.push({
      id: p.id,
      entityType: "project",
      entityId: p.id,
      title: p.title ?? "Project",
      summary: snippet(p.description ?? p.scopeNotes),
      url: `/projects/${p.id}`,
      thumbnail: "",
      publishedAt: p.createdAt ? p.createdAt.toISOString() : null,
      contentType: "project",
      headline: snippet(p.description ?? p.scopeNotes ?? p.title),
    });
  }

  if (projectIds.length > 0) {
    // Deliverables (no created_at column — order by submitted date).
    const deliverables = await db
      .select()
      .from(projectDeliverables)
      .where(
        and(
          or(
            ilike(projectDeliverables.title, q),
            ilike(projectDeliverables.notes, q),
          ),
        ),
      )
      .orderBy(desc(projectDeliverables.submittedAt));
    for (const d of deliverables) {
      if (!d.projectId || !projectIds.includes(d.projectId)) continue;
      results.push({
        id: d.id,
        entityType: "deliverable",
        entityId: d.id,
        title: d.title ?? "Deliverable",
        summary: snippet(d.notes),
        url: `/deliverables/${d.id}`,
        thumbnail: "",
        publishedAt: d.submittedAt ? d.submittedAt.toISOString() : null,
        contentType: "deliverable",
        headline: snippet(d.notes ?? d.title),
      });
    }

    // Messages.
    const messages = await db
      .select()
      .from(portalMessages)
      .where(ilike(portalMessages.message, q))
      .orderBy(desc(portalMessages.createdAt));
    for (const m of messages) {
      if (!m.projectId || !projectIds.includes(m.projectId)) continue;
      results.push({
        id: m.id,
        entityType: "message",
        entityId: m.id,
        title: "Message",
        summary: snippet(m.message),
        url: `/messages?projectId=${m.projectId}`,
        thumbnail: "",
        publishedAt: m.createdAt ? m.createdAt.toISOString() : null,
        contentType: "message",
        headline: snippet(m.message),
      });
    }
  }

  // Proposals (by client). Title/type come from the linked template.
  const proposals = await db
    .select({
      id: proposalDocuments.id,
      resolvedContent: proposalDocuments.resolvedContent,
      createdAt: proposalDocuments.createdAt,
      templateName: proposalTemplates.name,
    })
    .from(proposalDocuments)
    .leftJoin(
      proposalTemplates,
      eq(proposalTemplates.id, proposalDocuments.templateId),
    )
    .where(
      and(
        eq(proposalDocuments.clientId, clientId),
        or(
          ilike(proposalTemplates.name, q),
          ilike(proposalDocuments.resolvedContent, q),
        ),
      ),
    )
    .orderBy(desc(proposalDocuments.createdAt));
  for (const p of proposals) {
    results.push({
      id: p.id,
      entityType: "proposal",
      entityId: p.id,
      title: p.templateName ?? "Proposal",
      summary: snippet(p.resolvedContent),
      url: `/proposals/${p.id}`,
      thumbnail: "",
      publishedAt: p.createdAt ? p.createdAt.toISOString() : null,
      contentType: "proposal",
      headline: snippet(p.resolvedContent ?? p.templateName),
    });
  }

  // Invoices (by client).
  const invoices = await db
    .select()
    .from(financeInvoices)
    .where(
      and(
        eq(financeInvoices.clientId, clientId),
        or(
          ilike(financeInvoices.invoiceNumber, q),
          ilike(financeInvoices.notes, q),
        ),
      ),
    )
    .orderBy(desc(financeInvoices.createdAt));
  for (const inv of invoices) {
    results.push({
      id: inv.id,
      entityType: "invoice",
      entityId: inv.id,
      title: inv.invoiceNumber ?? "Invoice",
      summary: snippet(inv.notes),
      url: `/invoices/${inv.id}`,
      thumbnail: "",
      publishedAt: inv.createdAt ? inv.createdAt.toISOString() : null,
      contentType: "invoice",
      headline: snippet(inv.notes ?? inv.invoiceNumber),
    });
  }

  results.sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  const total = results.length;
  const start = (page - 1) * pageSize;
  return { results: results.slice(start, start + pageSize), total };
}
