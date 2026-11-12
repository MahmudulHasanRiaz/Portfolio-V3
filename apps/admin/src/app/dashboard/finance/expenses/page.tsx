"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaPicker } from "@/components/media-picker";

interface FinanceExpense {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  category: string | null;
  categoryId: string | null;
  description: string | null;
  amount: string | null;
  currency: string | null;
  exchangeRate: string | null;
  amountBdt: string | null;
  paymentMethodId: string | null;
  expenseDate: string | null;
  receiptUrl: string | null;
  createdAt: string | null;
}

interface ExpenseListResponse {
  expenses: FinanceExpense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ExpenseCategory {
  id: string;
  name: string | null;
  slug: string;
  isActive: boolean | null;
}

interface PaymentMethod {
  id: string;
  name: string | null;
  isActive: boolean | null;
}

const SOURCE_TYPES = ["freelance_project", "artist_event", "general"];

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtMoney = (currency: string | null, v: string | null) =>
  v === null ? "—" : `${currency ?? ""} ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const fmtBdt = (v: string | null) =>
  v === null ? "—" : `BDT ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");
const dateInput = (v: string | null) => (v ? v.slice(0, 10) : new Date().toISOString().slice(0, 10));

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };
// Radix DialogContent has no max-height: without this the dialog is clipped
// on short/phone viewports and the submit button becomes unreachable.
const dialogStyle: React.CSSProperties = { maxWidth: 640, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" };

interface ExpenseForm {
  sourceType: string;
  sourceId: string;
  categoryId: string;
  description: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  paymentMethodId: string;
  expenseDate: string;
  receiptUrl: string;
}

const emptyForm = (): ExpenseForm => ({
  sourceType: "general",
  sourceId: "",
  categoryId: "",
  description: "",
  amount: "",
  currency: "BDT",
  exchangeRate: "",
  paymentMethodId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  receiptUrl: "",
});

export default function FinanceExpensesPage() {
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceExpense | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  const fetchExpenses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/finance/expenses?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load expenses (${r.status})`);
        return json;
      })
      .then((res) => {
        if (!res || !Array.isArray(res.expenses)) throw new Error("Unexpected response from the expenses API");
        setData(res);
        setListError("");
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load expenses"))
      .finally(() => setLoading(false));
  }, [categoryId, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    fetch("/api/finance/expense-categories?pageSize=100")
      .then((r) => r.json())
      .then((res) => setCategories(res.expenseCategories ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoaded(true));
    fetch("/api/finance/payment-methods?onlyActive=true&pageSize=100")
      .then((r) => r.json())
      .then((res) => setMethods(res.paymentMethods ?? []))
      .catch(() => setMethods([]))
      .finally(() => setMethodsLoaded(true));
  }, []);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const needsRate = form.currency.trim().toUpperCase() !== "BDT";

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (x: FinanceExpense) => {
    setEditing(x);
    setForm({
      sourceType: x.sourceType ?? "general",
      sourceId: x.sourceId ?? "",
      categoryId: x.categoryId ?? "",
      description: x.description ?? "",
      amount: x.amount ?? "",
      currency: x.currency ?? "BDT",
      exchangeRate: x.exchangeRate ?? "",
      paymentMethodId: x.paymentMethodId ?? "",
      expenseDate: dateInput(x.expenseDate),
      receiptUrl: x.receiptUrl ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (needsRate && !form.exchangeRate) {
      setFormError("Exchange rate is required for non-BDT expenses.");
      return;
    }
    if (form.sourceType !== "general" && !form.sourceId.trim()) {
      setFormError("Source ID is required unless the source type is General.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sourceType: form.sourceType,
        categoryId: form.categoryId,
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase() || "BDT",
        paymentMethodId: form.paymentMethodId,
        expenseDate: form.expenseDate,
      };
      if (form.sourceType !== "general" && form.sourceId.trim()) body.sourceId = form.sourceId.trim();
      if (needsRate) body.exchangeRate = Number(form.exchangeRate);
      if (form.receiptUrl.trim()) body.receiptUrl = form.receiptUrl.trim();

      const res = await fetch(
        editing ? `/api/finance/expenses/${editing.id}` : "/api/finance/expenses",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to save expense");
        return;
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      fetchExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchExpenses();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to delete expense (${res.status})`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Expenses</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />Add Expense</Button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          style={{ ...selectStyle, width: "auto" }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>
          ))}
        </select>
      </div>

      {listError && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{listError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No expenses found</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount (BDT)</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((x) => (
                  <tr key={x.id}>
                    <td style={tdStyle}>{fmtDate(x.expenseDate)}</td>
                    <td style={tdStyle}>{x.category ? <Badge variant="secondary">{x.category}</Badge> : "—"}</td>
                    <td style={tdStyle}>
                      {labelOf(x.sourceType)}
                      {x.sourceId && <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}> {shortId(x.sourceId)}</span>}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "normal", minWidth: 180 }}>{x.description ?? "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(x.currency, x.amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtBdt(x.amountBdt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button variant="outline" size="sm" onClick={() => openEdit(x)}><Pencil size={14} /></Button>
                        <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(x.id)}><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            {data.total} total expenses
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent style={dialogStyle}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>Record an expense. Non-BDT amounts need an exchange rate so the BDT total can be computed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={labelStyle}>Source Type</label>
                <select value={form.sourceType} onChange={(e) => set("sourceType", e.target.value)} style={selectStyle}>
                  {SOURCE_TYPES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} style={selectStyle} required>
                  <option value="">Select category…</option>
                  {categories.filter((c) => c.isActive !== false).map((c) => <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>)}
                </select>
                {categoriesLoaded && categories.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                    No categories yet — create one in{" "}
                    <Link href="/dashboard/finance/expense-categories" style={{ color: "var(--accent, #0c7c6c)" }}>Finance → Expense Categories</Link>.
                  </div>
                )}
              </div>
              {form.sourceType !== "general" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Source ID (project / event UUID)</label>
                  <Input value={form.sourceId} onChange={(e) => set("sourceId", e.target.value)} placeholder="xxxxxxxx-xxxx-…" />
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} required />
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} required placeholder="BDT" />
              </div>
              {needsRate && (
                <div>
                  <label style={labelStyle}>Exchange Rate (1 {form.currency.toUpperCase()} = ? BDT)</label>
                  <Input type="number" step="0.0001" min="0" value={form.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} required />
                </div>
              )}
              <div>
                <label style={labelStyle}>Payment Method</label>
                <select value={form.paymentMethodId} onChange={(e) => set("paymentMethodId", e.target.value)} style={selectStyle} required>
                  <option value="">Select method…</option>
                  {methods.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
                </select>
                {methodsLoaded && methods.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                    No payment methods yet — create one in{" "}
                    <Link href="/dashboard/settings/payment-methods" style={{ color: "var(--accent, #0c7c6c)" }}>Settings → Payment Methods</Link>.
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Expense Date</label>
                <Input type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Receipt URL (optional)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input value={form.receiptUrl} onChange={(e) => set("receiptUrl", e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from library</Button>
                </div>
              </div>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Expense"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete expense"
        message="Delete this expense? This cannot be undone."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => set("receiptUrl", url)}
        type="all"
        title="Choose receipt"
      />
    </div>
  );
}
