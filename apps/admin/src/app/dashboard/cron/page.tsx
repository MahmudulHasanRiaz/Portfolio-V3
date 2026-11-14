// Cron jobs — what runs on the schedule, and when.
//
// The Hono API has two internal cron routes (apps/api/src/routes/admin/
// cron.ts), both GET and both gated by the x-cron-secret header against
// CRON_SECRET — a server secret the browser never holds. So this page
// cannot trigger a run or show a live "last run" (there is no endpoint
// for that); it documents the schedule so the admin can see what the
// Workers Cron Trigger does every 5 minutes. The trigger itself is
// wired in apps/api/wrangler.jsonc (triggers.crons ["*/5 * * * *"])
// and the `scheduled` handler in apps/api/src/index.ts invokes both
// routes internally.
import { Card, CardContent, Badge } from "@repo/ui";
import { Clock, Newspaper, GitBranch, ShieldCheck } from "lucide-react";

const JOBS = [
  {
    icon: Newspaper,
    name: "Publish scheduled content",
    endpoint: "GET /api/admin/cron/publish",
    description:
      "Publishes posts whose publishAt has passed (scheduled → published) and unpublishes posts whose unpublishAt has passed (published → draft). Also updates the search index and purges the public cache when anything flips.",
    returns: "{ success: true, published, unpublished }",
  },
  {
    icon: GitBranch,
    name: "Run pending workflows",
    endpoint: "GET /api/admin/cron/workflows",
    description:
      "Executes up to 25 pending workflow runs per tick, one per processNext tick. Each run executes synchronously in-request.",
    returns: "{ success: true, processed, runs }",
  },
];

export default function CronPage() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}
        >
          Cron
        </h1>
        <Badge>
          <Clock size={12} style={{ marginRight: 4 }} />
          Every 5 minutes
        </Badge>
      </div>
      <Card>
        <CardContent style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Clock size={18} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Schedule — */5 * * * *
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                The Cloudflare Workers Cron Trigger fires every 5 minutes and
                invokes both jobs below, in order, through the API&apos;s
                internal scheduled handler. No manual run is needed — and
                none is possible from this page.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <ShieldCheck size={18} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Authenticated by a server secret
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Both routes require the x-cron-secret header (CRON_SECRET).
                The browser never holds that secret, so the jobs cannot be
                triggered from the admin UI — only the Workers trigger can
                run them. A missing secret fails closed with a 500; a wrong
                one with a 401.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {JOBS.map((job) => (
          <Card key={job.endpoint}>
            <CardContent style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <job.icon size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {job.name}
                </div>
                <Badge>{job.endpoint}</Badge>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {job.description}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--text-muted)",
                }}
              >
                Returns {job.returns}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
