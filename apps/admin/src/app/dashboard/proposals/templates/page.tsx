"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ProposalTemplate {
  id: string;
  name: string | null;
  projectCategoryId: string | null;
  clientType: string | null;
  type: string | null;
  content: string | null;
  variables: Record<string, unknown> | null;
  isActive: boolean | null;
  createdBy: string | null;
  createdAt: string | null;
}

interface TemplateListResponse {
  templates: ProposalTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TYPES = ["proposal", "contract"];

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };

interface TemplateForm {
  name: string;
  type: string;
  clientType: string;
  projectCategoryId: string;
  content: string;
  variablesJson: string;
  isActive: boolean;
}

const emptyForm: TemplateForm = {
  name: "", type: "proposal", clientType: "", projectCategoryId: "",
  content: "", variablesJson: "", isActive: true,
};

export default function ProposalTemplatesPage() {
  const [data, setData] = useState<TemplateListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProposalTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    fetch("/api/proposals/templates?pageSize=100")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (tpl: ProposalTemplate) => {
    setEditing(tpl);
    setForm({
      name: tpl.name ?? "",
      type: tpl.type ?? "proposal",
      clientType: tpl.clientType ?? "",
      projectCategoryId: tpl.projectCategoryId ?? "",
      content: tpl.content ?? "",
      variablesJson: tpl.variables ? JSON.stringify(tpl.variables, null, 2) : "",
      isActive: tpl.isActive !== false,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const set = (key: keyof TemplateForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    let variables: Record<string, unknown> | undefined;
    if (form.variablesJson.trim()) {
      try {
        const parsed = JSON.parse(form.variablesJson);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setFormError("Variables must be a JSON object, e.g. {\"client_name\": \"\"}.");
          return;
        }
        variables = parsed as Record<string, unknown>;
      } catch {
        setFormError("Variables is not valid JSON.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        projectCategoryId: form.projectCategoryId.trim() || undefined,
        content: form.content,
        isActive: form.isActive,
      };
      if (form.clientType.trim()) body.clientType = form.clientType.trim();
      if (variables) body.variables = variables;

      const res = await fetch(
        editing ? `/api/proposals/templates/${editing.id}` : "/api/proposals/templates",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Failed to save template");
        return;
      }
      setDialogOpen(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tpl: ProposalTemplate) => {
    const res = await fetch(`/api/proposals/templates/${tpl.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: tpl.isActive === false ? true : false }),
    });
    if (res.ok) fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/proposals/templates/${id}`, { method: "DELETE" });
    if (res.ok) fetchTemplates();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Proposal Templates</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />New Template</Button>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        <Link href="/dashboard/proposals" style={{ color: "inherit" }}>← Back to documents</Link>
        {"  ·  "}Reusable templates with {"{{variable}}"} placeholders, filled in when a document is generated.
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No templates yet. Create your first one.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Client Type</th>
                <th style={thStyle}>Variables</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data.templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{tpl.name ?? "—"}</td>
                  <td style={tdStyle}>{labelOf(tpl.type)}</td>
                  <td style={tdStyle}>{tpl.clientType ?? "—"}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                    {tpl.variables ? Object.keys(tpl.variables).join(", ") || "—" : "—"}
                  </td>
                  <td style={tdStyle}>
                    <Badge variant={tpl.isActive === false ? "secondary" : "success"}>{tpl.isActive === false ? "Inactive" : "Active"}</Badge>
                  </td>
                  <td style={tdStyle}>{fmtDate(tpl.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}><Pencil size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(tpl)}>{tpl.isActive === false ? "Activate" : "Deactivate"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(tpl.id)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: 720 }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>Write the body with {"{{variable_name}}"} placeholders. Declare the variables as a JSON object so they can be filled in at generation time.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Web Development Proposal" />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} style={selectStyle}>
                    {TYPES.map((t) => <option key={t} value={t}>{labelOf(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Client Type (optional)</label>
                  <Input value={form.clientType} onChange={(e) => set("clientType", e.target.value)} placeholder="e.g. Local Business" />
                </div>
                <div>
                  <label style={labelStyle}>Project Category ID (UUID)</label>
                  <Input value={form.projectCategoryId} onChange={(e) => set("projectCategoryId", e.target.value)} placeholder="xxxxxxxx-xxxx-… (optional)" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Content</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  rows={10}
                  required
                  placeholder={"Dear {{client_name}},\n\nWe propose to build {{project_name}} for BDT {{amount}}…"}
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Variables (optional, JSON object)</label>
                <Textarea
                  value={form.variablesJson}
                  onChange={(e) => set("variablesJson", e.target.value)}
                  rows={3}
                  placeholder={'{"client_name": "", "project_name": "", "amount": ""}'}
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Active (available when generating documents)
              </label>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Template"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete template"
        message="Delete this template? Documents already generated from it are kept."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
