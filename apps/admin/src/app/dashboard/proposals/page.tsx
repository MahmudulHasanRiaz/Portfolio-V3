"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Input, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ProposalDocument {
  id: string;
  templateId: string | null;
  projectId: string | null;
  clientId: string | null;
  resolvedContent: string | null;
  status: string | null;
  version: number;
  parentDocumentId: string | null;
  pdfUrl: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

interface DocumentListResponse {
  documents: ProposalDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ProposalTemplate {
  id: string;
  name: string | null;
  type: string | null;
  clientType: string | null;
  isActive: boolean | null;
  variables: Record<string, unknown> | null;
}

const STATUSES = ["draft", "sent", "accepted", "rejected"];

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");

function statusVariant(status: string | null): "success" | "default" | "secondary" | "destructive" {
  if (status === "accepted") return "success";
  if (status === "sent") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };

interface VariableRow {
  key: string;
  value: string;
}

export default function ProposalDocumentsPage() {
  const router = useRouter();
  const [data, setData] = useState<DocumentListResponse | null>(null);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [leads, setLeads] = useState<{ id: string; fullName: string | null; email: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [latestOnly, setLatestOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ templateId: "", clientId: "", projectId: "" });
  const [variables, setVariables] = useState<VariableRow[]>([{ key: "", value: "" }]);

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("latestOnly", latestOnly ? "true" : "false");
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/proposals/documents?${params.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [status, latestOnly, page]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  useEffect(() => {
    // Only active templates are offered here: generating from an inactive
    // template is rejected server-side (TEMPLATE_INACTIVE).
    fetch("/api/proposals/templates?isActive=true&pageSize=100")
      .then((r) => r.json())
      .then((res) => setTemplates(res.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    // Picker options for the Generate dialog — leads (Client) and
    // projects (Project) instead of raw UUID text inputs.
    fetch("/api/leads?pageSize=200")
      .then((r) => r.json())
      .then((res) => setLeads(Array.isArray(res.leads) ? res.leads : []))
      .catch(() => setLeads([]));
    fetch("/api/content/projects?pageSize=100")
      .then((r) => r.json())
      .then((res) => setProjects(Array.isArray(res.items) ? res.items : []))
      .catch(() => setProjects([]));
  }, []);

  const templateOf = (id: string | null) => (id ? templates.find((t) => t.id === id) : undefined);

  const setVar = (idx: number, key: keyof VariableRow, value: string) =>
    setVariables((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  const addVar = () => setVariables((rows) => [...rows, { key: "", value: "" }]);
  const removeVar = (idx: number) => setVariables((rows) => rows.filter((_, i) => i !== idx));

  // When a template is chosen, prefill its declared variable names as rows.
  const onTemplateChange = (templateId: string) => {
    setForm((f) => ({ ...f, templateId }));
    const tpl = templates.find((t) => t.id === templateId);
    const names = tpl?.variables ? Object.keys(tpl.variables) : [];
    if (names.length > 0) {
      setVariables(names.map((name) => ({ key: name, value: "" })));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const vars: Record<string, string> = {};
    for (const row of variables) {
      if (row.key.trim()) vars[row.key.trim()] = row.value;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { templateId: form.templateId, variables: vars };
      if (form.clientId.trim()) body.clientId = form.clientId.trim();
      if (form.projectId.trim()) body.projectId = form.projectId.trim();

      const res = await fetch("/api/proposals/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Failed to generate proposal");
        return;
      }
      setDialogOpen(false);
      router.push(`/dashboard/proposals/${json.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Proposal Documents</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} style={{ marginRight: 6 }} />Generate Proposal</Button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ ...selectStyle, width: "auto" }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{labelOf(s)}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
          <input
            type="checkbox"
            checked={latestOnly}
            onChange={(e) => { setLatestOnly(e.target.checked); setPage(1); }}
          />
          Latest versions only
        </label>
        <Link href="/dashboard/proposals/templates" style={{ fontSize: 14 }}>Manage templates →</Link>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.documents.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No proposal documents found</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Template</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Version</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Sent</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map((doc) => {
                  const tpl = templateOf(doc.templateId);
                  return (
                    <tr key={doc.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        <Link href={`/dashboard/proposals/${doc.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                          {tpl?.name ?? shortId(doc.templateId)}
                        </Link>
                      </td>
                      <td style={tdStyle}>{labelOf(tpl?.type ?? null)}</td>
                      <td style={tdStyle}>v{doc.version}</td>
                      <td style={tdStyle}><Badge variant={statusVariant(doc.status)}>{labelOf(doc.status)}</Badge></td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }} title={doc.clientId ?? undefined}>{shortId(doc.clientId)}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }} title={doc.projectId ?? undefined}>{shortId(doc.projectId)}</td>
                      <td style={tdStyle}>{fmtDate(doc.sentAt ?? doc.createdAt)}</td>
                      <td style={tdStyle}>
                        <Link href={`/dashboard/proposals/${doc.id}`}>
                          <Button variant="outline" size="sm"><ExternalLink size={14} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
            {data.total} total documents
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>Generate Proposal</DialogTitle>
            <DialogDescription>Pick a template and fill its variables. The document is created as a draft (version 1).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerate}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Template</label>
                <select value={form.templateId} onChange={(e) => onTemplateChange(e.target.value)} style={selectStyle} required>
                  <option value="">Select template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name ?? t.id} ({labelOf(t.type)})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Client (lead, optional)</label>
                  <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} style={selectStyle}>
                    <option value="">No client</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName || l.email || l.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Project (optional)</label>
                  <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} style={selectStyle}>
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || p.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Variables</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {variables.map((row, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "180px 1fr 36px", gap: 8, alignItems: "center" }}>
                      <Input placeholder="key (e.g. client_name)" value={row.key} onChange={(e) => setVar(idx, "key", e.target.value)} style={{ fontFamily: "monospace" }} />
                      <Input placeholder="value" value={row.value} onChange={(e) => setVar(idx, "value", e.target.value)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeVar(idx)} disabled={variables.length === 1}><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVar} style={{ marginTop: 10 }}>
                  <Plus size={14} style={{ marginRight: 4 }} />Add Variable
                </Button>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Values replace {"{{key}}"} placeholders in the template content.
                </div>
              </div>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Generating..." : "Generate"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
