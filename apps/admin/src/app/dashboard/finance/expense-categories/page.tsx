"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ExpenseCategory {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface CategoryListResponse {
  expenseCategories: ExpenseCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
}

const emptyForm: CategoryForm = { name: "", slug: "", description: "", color: "", icon: "", isActive: true };

export default function ExpenseCategoriesPage() {
  const [data, setData] = useState<CategoryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategories = useCallback(() => {
    setLoading(true);
    fetch("/api/finance/expense-categories?pageSize=100")
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load categories (${r.status})`);
        return json;
      })
      .then((res) => {
        if (!res || !Array.isArray(res.expenseCategories)) throw new Error("Unexpected response from the expense-categories API");
        setData(res);
        setListError("");
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name ?? "",
      slug: cat.slug,
      description: cat.description ?? "",
      color: cat.color ?? "",
      icon: cat.icon ?? "",
      isActive: cat.isActive !== false,
    });
    setSlugTouched(true);
    setFormError("");
    setDialogOpen(true);
  };

  const set = (key: keyof CategoryForm, value: string | boolean) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        isActive: form.isActive,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.color.trim()) body.color = form.color.trim();
      if (form.icon.trim()) body.icon = form.icon.trim();

      const res = await fetch(
        editing ? `/api/finance/expense-categories/${editing.id}` : "/api/finance/expense-categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to save category");
        return;
      }
      setDialogOpen(false);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: ExpenseCategory) => {
    const res = await fetch(`/api/finance/expense-categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: cat.isActive === false ? true : false }),
    });
    if (res.ok) {
      fetchCategories();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to update category (${res.status})`);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/expense-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchCategories();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to delete category (${res.status})`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Expense Categories</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />New Category</Button>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Categories are fully managed here — create, edit, deactivate or delete them. Expenses pick from this list.
      </p>

      {listError && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{listError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.expenseCategories.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No categories yet. Create your first one.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Color</th>
                <th style={thStyle}>Icon</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data.expenseCategories.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{cat.name ?? "—"}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 13 }}>{cat.slug}</td>
                  <td style={{ ...tdStyle, whiteSpace: "normal", minWidth: 160 }}>{cat.description ?? "—"}</td>
                  <td style={tdStyle}>
                    {cat.color ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: cat.color, display: "inline-block", border: "1px solid var(--border)" }} />
                        {cat.color}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={tdStyle}>{cat.icon ?? "—"}</td>
                  <td style={tdStyle}>
                    <Badge variant={cat.isActive === false ? "secondary" : "success"}>{cat.isActive === false ? "Inactive" : "Active"}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="outline" size="sm" onClick={() => openEdit(cat)}><Pencil size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(cat)}>{cat.isActive === false ? "Activate" : "Deactivate"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(cat.id)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* Radix DialogContent has no max-height: without this the dialog is
            clipped on short/phone viewports and the submit button is unreachable. */}
        <DialogContent style={{ maxWidth: 560, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>The slug is generated from the name; you can adjust it before saving.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Hosting" />
              </div>
              <div>
                <label style={labelStyle}>Slug</label>
                <Input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                  required
                  placeholder="e.g. hosting"
                  style={{ fontFamily: "monospace" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Color (optional, hex)</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : "#000000"}
                      onChange={(e) => set("color", e.target.value)}
                      style={{ width: 40, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "none" }}
                    />
                    <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="#2e7d32" maxLength={7} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Icon (optional, lucide name)</label>
                  <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="e.g. Server" />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Active (available when logging expenses)
              </label>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Category"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete expense category"
        message="Delete this expense category? Existing expenses keep their saved category name."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
