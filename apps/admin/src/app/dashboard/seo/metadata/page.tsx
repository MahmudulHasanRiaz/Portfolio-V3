"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface SeoMeta {
  id: string;
  entityType: string | null;
  entityId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string | null;
  indexable: boolean | null;
  followLinks: boolean | null;
  noArchive: boolean | null;
  createdAt: string | null;
}

const ENTITY_TYPES = ["page", "post", "project", "service", "venture", "release"];

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };
const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");

interface MetaForm {
  entityType: string;
  entityId: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  canonicalUrl: string;
  keywords: string;
  indexable: boolean;
  followLinks: boolean;
  noArchive: boolean;
}

const emptyForm: MetaForm = {
  entityType: "page", entityId: "", metaTitle: "", metaDescription: "",
  ogImage: "", canonicalUrl: "", keywords: "",
  indexable: true, followLinks: true, noArchive: false,
};

export default function MetadataPage() {
  const [rows, setRows] = useState<SeoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeoMeta | null>(null);
  const [form, setForm] = useState<MetaForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchMeta = useCallback(() => {
    setLoading(true);
    setLoadError("");
    fetch("/api/seo/meta")
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setRows(res.meta ?? []);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load metadata."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (row: SeoMeta) => {
    setEditing(row);
    setForm({
      entityType: row.entityType ?? "page",
      entityId: row.entityId ?? "",
      metaTitle: row.metaTitle ?? "",
      metaDescription: row.metaDescription ?? "",
      ogImage: row.ogImage ?? "",
      canonicalUrl: row.canonicalUrl ?? "",
      keywords: row.keywords ?? "",
      indexable: row.indexable !== false,
      followLinks: row.followLinks !== false,
      noArchive: row.noArchive === true,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const set = (key: keyof MetaForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!UUID_RE.test(form.entityId.trim())) {
      setFormError("Entity ID must be a UUID (the content item's ID).");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        ogImage: form.ogImage.trim() || null,
        canonicalUrl: form.canonicalUrl.trim() || null,
        keywords: form.keywords.trim() || null,
        indexable: form.indexable,
        followLinks: form.followLinks,
        noArchive: form.noArchive,
      };
      if (!editing) {
        body.entityType = form.entityType;
        body.entityId = form.entityId.trim();
      }
      const res = await fetch(
        editing ? `/api/seo/meta/${editing.id}` : "/api/seo/meta",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Failed to save metadata");
        return;
      }
      setDialogOpen(false);
      fetchMeta();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/seo/meta/${id}`, { method: "DELETE" });
    if (res.ok) fetchMeta();
    else setLoadError("Failed to delete metadata.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Metadata Editor</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />New Metadata</Button>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>
        SEO meta titles, descriptions and OG images per content item. These
        records feed the SEO validation report.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        Note: no public page renders these rows yet — Ventures and Releases
        keep their own meta fields in their editors. Wiring the public site
        to this table needs a product decision.
      </p>

      {loadError && (
        <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--bg-danger, #fef2f2)", color: "var(--text-danger, #dc2626)", fontSize: 13, marginBottom: 16 }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No SEO metadata yet. Create your first record.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Entity</th>
                <th style={thStyle}>Entity ID</th>
                <th style={thStyle}>Meta Title</th>
                <th style={thStyle}>Meta Description</th>
                <th style={thStyle}>Indexable</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.entityType ?? "—"}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }} title={row.entityId ?? undefined}>{shortId(row.entityId)}</td>
                  <td style={{ ...tdStyle, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{row.metaTitle ?? "—"}</td>
                  <td style={{ ...tdStyle, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>{row.metaDescription ?? "—"}</td>
                  <td style={tdStyle}>
                    <Badge variant={row.indexable === false ? "secondary" : "success"}>{row.indexable === false ? "Noindex" : "Index"}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(row.id)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Metadata" : "New Metadata"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the SEO metadata for this content item."
                : "Attach SEO metadata to a content item by its type and UUID."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Entity Type</label>
                  <select value={form.entityType} onChange={(e) => set("entityType", e.target.value)} style={selectStyle} disabled={!!editing}>
                    {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Entity ID (UUID)</label>
                  <Input value={form.entityId} onChange={(e) => set("entityId", e.target.value)} required placeholder="xxxxxxxx-xxxx-…" disabled={!!editing} style={{ fontFamily: "monospace", fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Meta Title</label>
                <Input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} maxLength={160} placeholder="Page title for search results" />
              </div>
              <div>
                <label style={labelStyle}>Meta Description</label>
                <Textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={3} maxLength={320} placeholder="Short description for search results" />
              </div>
              <div>
                <label style={labelStyle}>OG Image URL</label>
                <Input value={form.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://…/image.jpg" />
              </div>
              <div>
                <label style={labelStyle}>Canonical URL</label>
                <Input value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…/page" />
              </div>
              <div>
                <label style={labelStyle}>Keywords (comma separated)</label>
                <Input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="erp, ecommerce, bangladesh" />
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                  <input type="checkbox" checked={form.indexable} onChange={(e) => set("indexable", e.target.checked)} />
                  Indexable
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                  <input type="checkbox" checked={form.followLinks} onChange={(e) => set("followLinks", e.target.checked)} />
                  Follow links
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                  <input type="checkbox" checked={form.noArchive} onChange={(e) => set("noArchive", e.target.checked)} />
                  No archive
                </label>
              </div>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Metadata"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete metadata"
        message="Delete this SEO metadata record? The content item itself is not affected."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
