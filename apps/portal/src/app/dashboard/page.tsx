"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import { FolderKanban, FileCheck, FileText } from "lucide-react";
import Link from "next/link";

interface ProjectSummary {
  id: string;
  title: string | null;
  status: string;
  expectedEndDate: string | null;
}

interface DashboardData {
  activeProjects: number;
  pendingDeliverables: number;
  openProposals: number;
  recentProjects: ProjectSummary[];
}

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((res) => {
        const projects = res.projects || [];
        const activeProjects = projects.filter((p: { status: string }) => p.status === "in_progress" || p.status === "under_review").length;
        setData({
          activeProjects,
          pendingDeliverables: 0,
          openProposals: 0,
          recentProjects: projects.slice(0, 5),
        });
      })
      .finally(() => setLoading(false));

    fetch("/api/deliverables?status=pending")
      .then((r) => r.json())
      .then((res) => setData((prev) => prev ? { ...prev, pendingDeliverables: res.total || 0 } : prev))
      .catch(() => {});

    fetch("/api/proposals?status=sent")
      .then((r) => r.json())
      .then((res) => setData((prev) => prev ? { ...prev, openProposals: res.total || 0 } : prev))
      .catch(() => {});
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading dashboard...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 16, padding: 20 }}>
            <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--muted)" }}>
              <FolderKanban size={24} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.activeProjects ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Active Projects</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 16, padding: 20 }}>
            <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--muted)" }}>
              <FileCheck size={24} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.pendingDeliverables ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Pending Deliverables</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 16, padding: 20 }}>
            <div style={{ padding: 12, borderRadius: 12, backgroundColor: "var(--muted)" }}>
              <FileText size={24} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.openProposals ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Open Proposals</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Projects</CardTitle></CardHeader>
        <CardContent>
          {!data?.recentProjects || data.recentProjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No projects yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.recentProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{p.title || "Untitled Project"}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge variant={p.status === "completed" ? "success" : p.status === "in_progress" ? "default" : "secondary"}>
                        {p.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
