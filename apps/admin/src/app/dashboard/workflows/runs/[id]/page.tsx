"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent } from "@repo/ui";
import { ArrowLeft, X } from "lucide-react";

interface WorkflowLog {
  id: string;
  actionType: string;
  actionOrder: number;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  triggerType: string;
  triggerEntityId: string | null;
  triggerPayload: Record<string, unknown>;
  status: string;
  retryCount: number;
  createdAt: string;
  completedAt: string | null;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString();
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const fetchRun = () => {
    setLoading(true);
    fetch(`/api/workflows/runs/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setRun(data.run);
        setLogs(data.logs || []);
      })
      .catch(() => router.push("/dashboard/workflows/runs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRun();
  }, [params.id]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError("");
    try {
      const res = await fetch(`/api/workflows/runs/${params.id}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
      const data = await res.json();
      setRun(data.run);
      fetchRun();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!run) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Run not found</div>;
  }

  const canRetry = run.status === "failed" || run.status === "partially_failed";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/workflows/runs")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          Run Details
        </h1>
        <Badge>{run.status.replace(/_/g, " ")}</Badge>
        {run.retryCount > 0 && <Badge variant="outline">Retries: {run.retryCount}</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Trigger Type</div>
            <div style={{ fontWeight: 600 }}>{run.triggerType.replace(/_/g, " ")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Workflow Version</div>
            <div style={{ fontWeight: 600 }}>v{run.workflowVersion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Created</div>
            <div style={{ fontWeight: 600 }}>{formatDate(run.createdAt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Completed</div>
            <div style={{ fontWeight: 600 }}>{formatDate(run.completedAt)}</div>
          </CardContent>
        </Card>
      </div>

      {run.triggerPayload && Object.keys(run.triggerPayload).length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Trigger Payload</div>
            <pre style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "pre-wrap", background: "var(--muted)", padding: 8, borderRadius: 4 }}>
              {JSON.stringify(run.triggerPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Action Logs</h2>
        {canRetry && (
          <Button onClick={handleRetry} disabled={retrying}>
            {retrying ? "Retrying..." : "Retry Run"}
          </Button>
        )}
      </div>

      {retryError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 12px",
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid var(--red, var(--destructive, #b3372f))",
            background: "var(--red-soft, #fbe9e7)",
            color: "var(--red, var(--destructive, #b3372f))",
            fontSize: 14,
          }}
        >
          <span>{retryError}</span>
          <Button variant="ghost" size="sm" onClick={() => setRetryError("")} aria-label="Dismiss error">
            <X size={14} />
          </Button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No action logs yet</div>
        ) : (
          logs.sort((a, b) => a.actionOrder - b.actionOrder).map((log) => (
            <Card key={log.id}>
              <CardContent style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                      #{log.actionOrder} {log.actionType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <Badge>{log.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Started: {formatDate(log.startedAt)} | Completed: {formatDate(log.completedAt)}
                </div>
                {log.error && (
                  <div style={{ marginTop: 8, padding: 8, background: "var(--destructive)", borderRadius: 4, fontSize: 12, color: "white" }}>
                    {log.error}
                  </div>
                )}
                {log.output && Object.keys(log.output).length > 0 && (
                  <pre style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "pre-wrap", marginTop: 4, background: "var(--muted)", padding: 4, borderRadius: 4 }}>
                    {JSON.stringify(log.output, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
