"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, Badge, Card, CardContent } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
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

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

export default function WorkflowRunsByWorkflowPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<RunListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchRuns = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("workflowId", params.id);
    qs.set("page", String(page));
    qs.set("pageSize", "20");

    fetch(`/api/workflows/runs?${qs.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, [page, params.id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href={`/dashboard/workflows/${params.id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Run History</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No runs for this workflow</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.items.map((run) => (
              <Link key={run.id} href={`/dashboard/workflows/runs/${run.id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                        v{run.workflowVersion} — {run.triggerType.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        Created: {formatDate(run.createdAt)}
                        {run.completedAt ? ` | Completed: ${formatDate(run.completedAt)}` : ""}
                        {run.retryCount > 0 ? ` | Retries: ${run.retryCount}` : ""}
                      </div>
                    </div>
                    <Badge>{run.status.replace(/_/g, " ")}</Badge>
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
