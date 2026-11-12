"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

interface Project {
  id: string; title: string | null; status: string;
  currency: string | null; totalAgreedAmount: string | null;
  startDate: string | null; expectedEndDate: string | null; createdAt: string | null;
}

export default function PortalProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((res) => setProjects(res.projects || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Projects</h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <FolderKanban size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No projects yet</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
              <Card>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.title || "Project"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {p.totalAgreedAmount ? `${p.currency || ""} ${p.totalAgreedAmount}` : ""}
                      {p.expectedEndDate ? ` | Due: ${new Date(p.expectedEndDate).toLocaleDateString()}` : p.createdAt ? ` | Created: ${new Date(p.createdAt).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Badge variant={p.status === "completed" ? "success" : p.status === "active" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
