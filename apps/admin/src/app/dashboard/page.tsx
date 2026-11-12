import Link from "next/link";
import {
  Calendar,
  FolderKanban,
  ListChecks,
  Newspaper,
  Receipt,
  Users,
} from "lucide-react";
import { getServerSession } from "@/lib/get-server-session";
import { listContent } from "@/actions/content";
import { createCrmRepositories } from "@repo/crm";
import { createFinanceRepositories } from "@repo/finance";

// Live counts + session are per-request: this page must not be statically
// prerendered at build time (prerendering would throw "Authentication
// required" from listContent, which needs a session).
export const dynamic = "force-dynamic";

// Each widget count is fetched INDEPENDENTLY. Previously all four counts
// ran in a single Promise.all, so ONE failing source rejected the whole
// page into the /dashboard error boundary ("Something went wrong") while
// the sidebar/topbar still rendered — that is exactly the 2026-10-28
// outage: the finance page kept working because it uses its own API route
// and fresh DB clients, but a source on this page (a session-validation
// flap inside an RSC render, a stuck shared-DB-client pool, a locked
// table) can fail while the rest of the app is healthy. So every source
// below is isolated: on failure it logs server-side (visible in the
// container log, so the failing source can still be identified) and falls
// back to 0, and the page ALWAYS renders its widgets + quick actions.
// These helpers must never throw: the repository-factory calls live inside
// the try blocks too, so even a bad DATABASE_URL degrades instead of
// blanking the page.
async function safeContentCount(type: "projects" | "posts"): Promise<number> {
  try {
    const res = await listContent(type, { pageSize: 1 });
    return Number(res.pagination?.total ?? 0);
  } catch (error) {
    console.error(`[dashboard] ${type} count failed:`, error);
    return 0;
  }
}

const TERMINAL_LEAD_STATUSES = ["won", "lost", "archived"];

async function safeActiveLeadCount(dbUrl: string): Promise<number> {
  try {
    const rows = await createCrmRepositories(dbUrl).leads.getPipelineCounts();
    return rows
      .filter((row) => !TERMINAL_LEAD_STATUSES.includes(row.status))
      .reduce((sum, row) => sum + row.count, 0);
  } catch (error) {
    console.error("[dashboard] Active Leads count failed:", error);
    return 0;
  }
}

async function safeOpenInvoiceCount(dbUrl: string): Promise<number> {
  try {
    const res = await createFinanceRepositories(dbUrl).invoices.list({
      status: "sent",
      pageSize: 1,
    });
    return Number(res.total ?? 0);
  } catch (error) {
    console.error("[dashboard] Open Invoices count failed:", error);
    return 0;
  }
}

// Widget counts come from the dashboard's EXISTING data sources — no new
// API routes, no new modules. Definitions:
// - Total Projects: all content items of type "projects" (any status).
// - Active Leads: leads whose status is not a terminal state. Terminal
//   states are 'won', 'lost', 'archived' — the same definition the CRM
//   follow-up queue uses (lead-repository.ts).
// - Blog Posts: all content items of type "posts" (any status).
// - Open Invoices: invoices with status "sent" (issued, unpaid). Drafts
//   are not issued yet; paid/cancelled are closed.
// - Pending Tasks / Upcoming Events: NO existing server source (workflow
//   tasks are never persisted — create-task only returns data; the
//   events module was never built and artist_events has no queries), so
//   those two widgets stay exactly as they were. Do not read numbers
//   into them — they are placeholders until their modules exist.
export default async function DashboardHome() {
  const session = await getServerSession();
  const dbUrl = process.env.DATABASE_URL!;

  // Safe helpers never reject, so Promise.all here cannot trip the error
  // boundary; a failed source just shows 0 for its widget (see above).
  const [projectCount, postCount, activeLeads, openInvoices] = await Promise.all([
    safeContentCount("projects"),
    safeContentCount("posts"),
    safeActiveLeadCount(dbUrl),
    safeOpenInvoiceCount(dbUrl),
  ]);

  // Icons + foot lines are display-only: values still come from the live
  // sources above. No delta pills and no sparklines — no delta/sparkline
  // data exists for these widgets, and none is invented.
  // Live KPIs link to the list they count. The two widgets with no live
  // source stay plain cards — they link nowhere rather than to an
  // unrelated page.
  const widgets = [
    { label: "Total Projects", value: String(projectCount), icon: FolderKanban, foot: "All content items, any status", href: "/dashboard/projects" },
    { label: "Active Leads", value: String(activeLeads), icon: Users, foot: "Excludes won, lost & archived", href: "/dashboard/crm" },
    { label: "Blog Posts", value: String(postCount), icon: Newspaper, foot: "All posts, any status", href: "/dashboard/blog" },
    { label: "Pending Tasks", value: "0", icon: ListChecks, foot: "No live source yet", href: null },
    { label: "Upcoming Events", value: "0", icon: Calendar, foot: "No live source yet", href: null },
    { label: "Open Invoices", value: String(openInvoices), icon: Receipt, foot: "Issued & unpaid (status: sent)", href: "/dashboard/finance/invoices" },
  ];

  // Quick actions link ONLY to routes verified to exist as dashboard pages
  // (each has its own page.tsx under apps/dashboard/src/app/dashboard/).
  // No dead links: /dashboard/system has no page and is deliberately absent.
  const quickActions = [
    { label: "Finance", description: "Invoices, payments & expenses", href: "/dashboard/finance" },
    { label: "CRM", description: "Leads & pipeline", href: "/dashboard/crm" },
    { label: "Content", description: "Pages, posts & media", href: "/dashboard/content" },
    { label: "Projects", description: "Project content", href: "/dashboard/projects" },
    { label: "Proposals", description: "Proposal documents", href: "/dashboard/proposals" },
    { label: "Settings", description: "Site & account settings", href: "/dashboard/settings" },
  ];

  return (
    <div>
      {/* Grid breakpoints live in a plain <style> tag: this is a server
          component and the KPI grid needs real media queries (3 cols, 2
          cols ≤1180px, 1 col ≤560px), which inline styles cannot express. */}
      <style>{`
        .ov-kpi-grid, .ov-qa-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 1180px) {
          .ov-kpi-grid, .ov-qa-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .ov-kpi-grid, .ov-qa-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <h1
        style={{
          fontSize: "clamp(21px, 2.5vw, 27px)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          margin: "0 0 8px",
          lineHeight: 1.2,
        }}
      >
        Dashboard
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
      </p>

      <div className="ov-kpi-grid" style={{ marginBottom: 32 }}>
        {widgets.map((widget) => {
          const cardStyle: React.CSSProperties = {
            padding: 18,
            borderRadius: 14,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface, var(--bg-card, var(--bg-primary)))",
            boxShadow:
              "var(--shadow-sm, 0 1px 2px rgba(16, 22, 19, 0.05))",
          };
          const body = (
            <>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: "var(--accent-soft, var(--bg-active))",
                  color: "var(--accent-ink, var(--brand))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <widget.icon size={19} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                {widget.label}
              </div>
              <div
                style={{
                  fontSize: 29,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                {widget.value}
              </div>
              <div style={{ fontSize: 12.3, color: "var(--text-muted)", marginTop: 6 }}>
                {widget.foot}
              </div>
            </>
          );
          return widget.href ? (
            <Link
              key={widget.label}
              href={widget.href}
              style={{ ...cardStyle, display: "block", textDecoration: "none" }}
            >
              {body}
            </Link>
          ) : (
            <div key={widget.label} style={cardStyle}>
              {body}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
        Quick actions
      </h2>
      <div className="ov-qa-grid">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: 18,
              borderRadius: 14,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface, var(--bg-card, var(--bg-primary)))",
              boxShadow:
                "var(--shadow-sm, 0 1px 2px rgba(16, 22, 19, 0.05))",
              textDecoration: "none",
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                {action.label}
              </span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)" }}>
                {action.description}
              </span>
            </span>
            <span style={{ fontSize: 18, color: "var(--accent-ink, var(--brand))", flexShrink: 0 }} aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
