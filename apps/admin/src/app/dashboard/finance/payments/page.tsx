"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface FinancePayment {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  clientId: string | null;
  amount: string | null;
  currency: string | null;
  exchangeRate: string | null;
  amountBdt: string | null;
  paymentMethodId: string | null;
  paymentDate: string | null;
  paymentType: string | null;
  notes: string | null;
  invoiceId: string | null;
  createdAt: string | null;
}

interface PaymentListResponse {
  payments: FinancePayment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaymentMethod {
  id: string;
  name: string | null;
  type: string | null;
  isActive: boolean | null;
}

const SOURCE_TYPES = ["freelance_project", "artist_event"];
const PAYMENT_TYPES = ["advance", "installment", "final", "full"];

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

interface PaymentForm {
  sourceType: string;
  sourceId: string;
  clientId: string;
  paymentMethodId: string;
  paymentType: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  paymentDate: string;
  invoiceId: string;
  notes: string;
}

const emptyForm = (): PaymentForm => ({
  sourceType: "freelance_project",
  sourceId: "",
  clientId: "",
  paymentMethodId: "",
  paymentType: "advance",
  amount: "",
  currency: "BDT",
  exchangeRate: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  invoiceId: "",
  notes: "",
});

export default function FinancePaymentsPage() {
  const [data, setData] = useState<PaymentListResponse | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancePayment | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<PaymentForm>(emptyForm);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sourceType) params.set("sourceType", sourceType);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/finance/payments?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load payments (${r.status})`);
        return json;
      })
      .then((res) => {
        if (!res || !Array.isArray(res.payments)) throw new Error("Unexpected response from the payments API");
        setData(res);
        setListError("");
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load payments"))
      .finally(() => setLoading(false));
  }, [sourceType, page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  useEffect(() => {
    fetch("/api/finance/payment-methods?onlyActive=true&pageSize=100")
      .then((r) => r.json())
      .then((res) => setMethods(res.paymentMethods ?? []))
      .catch(() => setMethods([]))
      .finally(() => setMethodsLoaded(true));
  }, []);

  const methodName = (id: string | null) => {
    if (!id) return "—";
    const m = methods.find((x) => x.id === id);
    return m?.name ?? shortId(id);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const needsRate = form.currency.trim().toUpperCase() !== "BDT";

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (p: FinancePayment) => {
    setEditing(p);
    setForm({
      sourceType: p.sourceType ?? "freelance_project",
      sourceId: p.sourceId ?? "",
      clientId: p.clientId ?? "",
      paymentMethodId: p.paymentMethodId ?? "",
      paymentType: p.paymentType ?? "advance",
      amount: p.amount ?? "",
      currency: p.currency ?? "BDT",
      exchangeRate: p.exchangeRate ?? "",
      paymentDate: dateInput(p.paymentDate),
      invoiceId: p.invoiceId ?? "",
      notes: p.notes ?? "",
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
      setFormError("Exchange rate is required for non-BDT payments.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sourceType: form.sourceType,
        sourceId: form.sourceId.trim(),
        clientId: form.clientId.trim(),
        paymentMethodId: form.paymentMethodId,
        paymentType: form.paymentType,
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase() || "BDT",
        paymentDate: form.paymentDate,
      };
      if (needsRate) body.exchangeRate = Number(form.exchangeRate);
      if (form.invoiceId.trim()) body.invoiceId = form.invoiceId.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch(
        editing ? `/api/finance/payments/${editing.id}` : "/api/finance/payments",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to save payment");
        return;
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      fetchPayments();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/payments/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPayments();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to delete payment (${res.status})`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Payments</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />Log Payment</Button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={sourceType}
          onChange={(e) => { setSourceType(e.target.value); setPage(1); }}
          style={{ ...selectStyle, width: "auto" }}
        >
          <option value="">All Sources</option>
          {SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>{labelOf(s)}</option>
          ))}
        </select>
      </div>

      {listError && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{listError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.payments.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No payments found</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Method</th>
                  <th style={thStyle}>Type</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount (BDT)</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{fmtDate(p.paymentDate)}</td>
                    <td style={tdStyle}>
                      {labelOf(p.sourceType)}
                      <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}> {shortId(p.sourceId)}</span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }} title={p.clientId ?? undefined}>{shortId(p.clientId)}</td>
                    <td style={tdStyle}>{methodName(p.paymentMethodId)}</td>
                    <td style={tdStyle}><Badge variant="secondary">{labelOf(p.paymentType)}</Badge></td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(p.currency, p.amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtBdt(p.amountBdt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                        <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(p.id)}><Trash2 size={14} /></Button>
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
            {data.total} total payments
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent style={dialogStyle}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Payment" : "Log Payment"}</DialogTitle>
            <DialogDescription>Record a payment received. Non-BDT amounts need an exchange rate so the BDT total can be computed.</DialogDescription>
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
                <label style={labelStyle}>Payment Type</label>
                <select value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)} style={selectStyle}>
                  {PAYMENT_TYPES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source ID (project / event UUID)</label>
                <Input value={form.sourceId} onChange={(e) => set("sourceId", e.target.value)} required placeholder="xxxxxxxx-xxxx-…" />
              </div>
              <div>
                <label style={labelStyle}>Client ID (lead UUID)</label>
                <Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required placeholder="xxxxxxxx-xxxx-…" />
              </div>
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
                <label style={labelStyle}>Payment Date</label>
                <Input type="date" value={form.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} required />
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
                <label style={labelStyle}>Invoice ID (optional)</label>
                <Input value={form.invoiceId} onChange={(e) => set("invoiceId", e.target.value)} placeholder="xxxxxxxx-xxxx-…" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notes (optional)</label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Log Payment"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete payment"
        message="Delete this payment? This cannot be undone."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
