"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Search } from "lucide-react";
import Link from "next/link";

interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  triggerType: string;
  status: string;
  retryCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface RunListResponse {
  items: WorkflowRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const RUN_STATUSES = ["", "pending", "running", "completed", "failed", "partially_failed"];

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

export default function WorkflowRunsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<RunListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const fetchRuns = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "20");

    fetch(`/api/workflows/runs?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !Array.isArray(json.items)) throw new Error(json.error || "Failed to fetch workflow runs");
        return json;
      })
      .then(setData)
      .catch(() => setData({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, [page, status]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Workflow Runs</h1>
        <Link href="/dashboard/workflows">
          <Button variant="outline" size="sm"><Search size={14} style={{ marginRight: 4 }} />Back to Workflows</Button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RUN_STATUSES.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No runs found</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.items.map((run) => (
              <Link key={run.id} href={`/dashboard/workflows/runs/${run.id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                        {run.triggerType.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        v{run.workflowVersion} | Created: {formatDate(run.createdAt)}
                        {run.completedAt ? ` | Completed: ${formatDate(run.completedAt)}` : ""}
                        {run.retryCount > 0 ? ` | Retries: ${run.retryCount}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge>{run.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >{p}</Button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
            {data.total} total runs
          </div>
        </>
      )}
    </div>
  );
}
