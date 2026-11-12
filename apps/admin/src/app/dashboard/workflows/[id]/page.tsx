"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ArrowLeft, Activity, Trash2, Plus, Play, FlaskConical } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  ACTION_CONFIG_FIELDS,
  coerceActionConfigs,
  type WorkflowActionEntry as ActionEntry,
} from "@/lib/workflow-actions";

interface WorkflowData {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actions: ActionEntry[];
  version: number;
  isActive: boolean;
  maxRetries: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  triggered: number;
  runIds: string[];
}

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [maxRetries, setMaxRetries] = useState("3");
  const [isActive, setIsActive] = useState(true);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState("");
  const [processError, setProcessError] = useState("");

  const fetchWorkflow = () => {
    setLoading(true);
    fetch(`/api/workflows/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((w) => {
        setWorkflow(w);
        setName(w.name);
        setTriggerType(w.triggerType);
        setMaxRetries(String(w.maxRetries));
        setIsActive(w.isActive);
        setActions(w.actions || []);
      })
      .catch(() => router.push("/dashboard/workflows"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflow();
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/workflows/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerType,
          maxRetries: parseInt(maxRetries, 10) || 3,
          isActive,
          actions: coerceActionConfigs(actions),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      const updated = await res.json();
      setWorkflow(updated);
      setActions(updated.actions || []);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to delete workflow");
      }
      router.push("/dashboard/workflows");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete workflow");
    } finally {
      setDeleting(false);
    }
  };

  const handleTestTrigger = async () => {
    setTesting(true);
    setTestError("");
    setTestResult(null);
    try {
      const res = await fetch("/api/workflows/trigger-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerType, entityId: "", payload: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Trigger test failed");
      setTestResult({ triggered: json.triggered ?? 0, runIds: json.runIds ?? [] });
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Trigger test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleProcessNow = async () => {
    setProcessing(true);
    setProcessError("");
    setProcessResult("");
    try {
      const res = await fetch("/api/workflows/process", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process runs");
      setProcessResult(
        json.processed
          ? `Processed run ${json.runId ?? ""} — status: ${json.status ?? "unknown"}.`
          : "No pending runs to process.",
      );
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Failed to process runs");
    } finally {
      setProcessing(false);
    }
  };

  const addAction = () => {
    setActions((prev) => [...prev, { type: "", config: {}, order: prev.length + 1 }]);
  };

  const removeAction = (order: number) => {
    setActions((prev) => prev.filter((a) => a.order !== order).map((a, i) => ({ ...a, order: i + 1 })));
  };

  const updateActionType = (order: number, type: string) => {
    setActions((prev) => prev.map((a) => a.order === order ? { ...a, type, config: {} } : a));
  };

  const updateActionConfig = (order: number, key: string, value: string) => {
    setActions((prev) => prev.map((a) => a.order === order ? { ...a, config: { ...a.config, [key]: value } } : a));
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!workflow) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Workflow not found</div>;
  }

  const sortedActions = [...actions].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/workflows")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {workflow.name}
        </h1>
        <Badge>{workflow.isActive ? "Active" : "Inactive"}</Badge>
        <Badge variant="outline">v{workflow.version}</Badge>
        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
          <Trash2 size={14} style={{ marginRight: 4 }} />Delete
        </Button>
      </div>

      <Tabs defaultValue="edit">
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="test">Test &amp; Run</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Card>
            <CardContent style={{ padding: 24 }}>
              {saveError && (
                <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{saveError}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Trigger Type</label>
                    <Select value={triggerType} onValueChange={setTriggerType}>
                      <SelectTrigger><SelectValue placeholder="Select trigger..." /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Max Retries</label>
                    <Input type="number" value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Active</label>
                    <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <label style={{ fontSize: 14, fontWeight: 500 }}>Actions ({actions.length})</label>
                    <Button type="button" variant="outline" size="sm" onClick={addAction}>
                      <Plus size={14} style={{ marginRight: 4 }} />Add Action
                    </Button>
                  </div>

                  {sortedActions.map((action) => (
                    <Card key={action.order} style={{ marginBottom: 8 }}>
                      <CardContent style={{ padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>Action #{action.order}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeAction(action.order)} aria-label={`Remove action ${action.order}`}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                          <Select value={action.type} onValueChange={(v) => updateActionType(action.order, v)}>
                            <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((at) => (
                                <SelectItem key={at} value={at}>{at.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {action.type && ACTION_CONFIG_FIELDS[action.type]?.map((field) => (
                            <Input
                              key={field.key}
                              placeholder={field.label}
                              type={field.type}
                              value={String(action.config[field.key] ?? "")}
                              onChange={(e) => updateActionConfig(action.order, field.key, e.target.value)}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {actions.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 16, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
                      No actions configured. Click "Add Action" to define what happens when this workflow triggers.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Link href={`/dashboard/workflows/${params.id}/runs`}>
            <Button variant="outline"><Activity size={14} style={{ marginRight: 6 }} />View Run History</Button>
          </Link>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardContent style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Test trigger</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                  Dispatches a test <strong>{triggerType.replace(/_/g, " ")}</strong> event. Matching active
                  workflows queue a run, which the scheduler processes within ~5 minutes — or use
                  "Process pending runs" below to run it right now.
                </div>
                <Button variant="outline" onClick={() => void handleTestTrigger()} disabled={testing}>
                  <FlaskConical size={14} style={{ marginRight: 6 }} />{testing ? "Testing..." : "Test Trigger"}
                </Button>
                {testError && <div style={{ color: "var(--destructive)", marginTop: 12, fontSize: 14 }}>{testError}</div>}
                {testResult && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    Triggered {testResult.triggered} workflow{testResult.triggered === 1 ? "" : "s"}.
                    {testResult.runIds.length > 0 && (
                      <span> Runs: {testResult.runIds.map((runId, i) => (
                        <span key={runId}>
                          {i > 0 ? ", " : " "}
                          <Link href={`/dashboard/workflows/runs/${runId}`} style={{ color: "var(--brand, #0c7c6c)" }}>{runId.slice(0, 8)}…</Link>
                        </span>
                      ))}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Process pending runs</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                  Executes the next pending run immediately instead of waiting for the scheduler.
                </div>
                <Button variant="outline" onClick={() => void handleProcessNow()} disabled={processing}>
                  <Play size={14} style={{ marginRight: 6 }} />{processing ? "Processing..." : "Process Pending Runs"}
                </Button>
                {processError && <div style={{ color: "var(--destructive)", marginTop: 12, fontSize: 14 }}>{processError}</div>}
                {processResult && <div style={{ marginTop: 12, fontSize: 14 }}>{processResult}</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete workflow"
        message={`Delete the workflow "${workflow.name}"? Its run history is deleted with it.`}
        onConfirm={() => void handleDelete()}
        busy={deleting}
        busyLabel="Deleting..."
      />
    </div>
  );
}
