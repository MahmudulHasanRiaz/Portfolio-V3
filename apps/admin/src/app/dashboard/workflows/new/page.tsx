"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent } from "@repo/ui";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  ACTION_CONFIG_FIELDS,
  coerceActionConfigs,
  type WorkflowActionEntry as ActionEntry,
} from "@/lib/workflow-actions";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [maxRetries, setMaxRetries] = useState("3");
  const [actions, setActions] = useState<ActionEntry[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !triggerType || actions.length === 0) {
      setError("Name, trigger type, and at least one action are required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const body = {
        name,
        triggerType,
        triggerConfig: {},
        actions: coerceActionConfigs(actions).map((a) => ({ type: a.type, config: a.config, order: a.order })),
        maxRetries: parseInt(maxRetries, 10) || 3,
      };

      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create workflow");
      }

      const workflow = await res.json();
      router.push(`/dashboard/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/workflows">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>New Workflow</h1>
      </div>

      <Card>
        <CardContent style={{ padding: 24 }}>
          {error && (
            <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Trigger Type</label>
                <Select value={triggerType} onValueChange={setTriggerType} required>
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
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 500 }}>Actions</label>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                  <Plus size={14} style={{ marginRight: 4 }} />Add Action
                </Button>
              </div>

              {actions.map((action) => (
                <Card key={action.order} style={{ marginBottom: 8 }}>
                  <CardContent style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Action #{action.order}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAction(action.order)}>
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
                          value={String(action.config[field.key] || "")}
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
              <Link href="/dashboard/workflows">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Workflow"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
