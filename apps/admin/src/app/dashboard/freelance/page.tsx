"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge, Card, CardContent } from "@repo/ui";
import { Plus, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  title: string | null;
  clientId: string | null;
  status: string;
  totalAgreedAmount: string | null;
  currency: string | null;
  portalAccessEnabled: boolean | null;
  createdAt: string | null;
}

interface ListResponse {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUSES = ["", "draft", "in_progress", "under_review", "revision_requested", "completed", "archived"];

export default function FreelanceProjectsListPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const fetchProjects = (pageOverride?: number, searchOverride?: string, statusOverride?: string) => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams();
    const q = searchOverride !== undefined ? searchOverride : search;
    const st = statusOverride !== undefined ? statusOverride : status;
    if (q) params.set("search", q);
    if (st) params.set("status", st);
    params.set("page", String(pageOverride !== undefined ? pageOverride : page));
    params.set("pageSize", "20");

    fetch(`/api/freelance/projects?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !Array.isArray(json.projects)) throw new Error(json.error || "Failed to load projects");
        return json as ListResponse;
      })
      .then(setData)
      .catch((err) => {
        setData(null);
        setLoadError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, [page, status]);

  const handleSearch = () => { setPage(1); fetchProjects(1); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Freelance Projects</h1>
        <Link href="/dashboard/freelance/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Project</Button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}
        >
          <option value="">All Status</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={handleSearch}><Search size={14} /></Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : loadError ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--destructive)" }}>
          {loadError}
          <div style={{ marginTop: 12 }}>
            <Button variant="outline" size="sm" onClick={() => fetchProjects()}>Retry</Button>
          </div>
        </div>
      ) : !data || data.projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No projects found</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.projects.map((project) => (
              <Card key={project.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {project.title || "Untitled Project"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {project.totalAgreedAmount ? `${project.currency || "USD"} ${project.totalAgreedAmount}` : ""}
                      {project.portalAccessEnabled ? " | Portal: Active" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant={project.status === "completed" ? "success" : project.status === "in_progress" ? "default" : "secondary"}>
                      {project.status?.replace(/_/g, " ")}
                    </Badge>
                    <Link href={`/dashboard/freelance/${project.id}`}>
                      <Button variant="outline" size="sm"><ExternalLink size={14} /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
            {data.total} total projects
          </div>
        </>
      )}
    </div>
  );
}
