"use server";

import { getServerSession } from "@/lib/get-server-session";
import { honoFetch } from "@/lib/hono-client";

// Dashboard widget counts — Hono-backed, same pattern as listContent
// in actions/content.ts (server action -> honoFetch, session checked).
//
// These replace the dashboard page's direct-DB reads
// (createCrmRepositories / createFinanceRepositories with
// process.env.DATABASE_URL). The numbers are identical to the old
// sources, by construction:
// - Active Leads: GET /api/admin/leads/stats returns byStatus — the
//   same `SELECT status, COUNT(*) GROUP BY status` the old
//   getPipelineCounts() ran — summed over non-terminal statuses.
//   Terminal states are 'won', 'lost', 'archived', the same
//   definition the CRM follow-up queue uses.
// - Open Invoices: GET /api/admin/finance/invoices?status=sent
//   returns { total } — the count of invoices with status "sent",
//   the same number the old invoices.list({ status: "sent" }).total
//   returned.
// Both helpers throw on Hono failure (HonoApiError); the dashboard
// page's safe* wrappers catch and fall back to 0, so the page still
// renders when a source fails.

const TERMINAL_LEAD_STATUSES = ["won", "lost", "archived"];

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

export async function getActiveLeadCount(): Promise<number> {
  const session = await getServerSession();
  getUserId(session);
  const stats = await honoFetch<{
    byStatus: { status: string; count: number }[];
  }>("/api/admin/leads/stats");
  return (stats.byStatus ?? [])
    .filter((row) => !TERMINAL_LEAD_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + Number(row.count ?? 0), 0);
}

export async function getOpenInvoiceCount(): Promise<number> {
  const session = await getServerSession();
  getUserId(session);
  const res = await honoFetch<{ total: number }>("/api/admin/finance/invoices", {
    query: { status: "sent", pageSize: 1 },
  });
  return Number(res.total ?? 0);
}
