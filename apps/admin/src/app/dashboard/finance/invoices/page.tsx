"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Textarea, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface FinanceInvoice {
  id: string;
  invoiceNumber: string | null;
  sourceType: string | null;
  sourceId: string | null;
  clientId: string | null;
  lineItems: InvoiceLineItem[] | null;
  subtotal: string | null;
  discount: string | null;
  total: string | null;
  totalBdt: string | null;
  currency: string | null;
  exchangeRate: string | null;
  status: string | null;
  issuedDate: string | null;
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string | null;
}

interface InvoiceListResponse {
  invoices: FinanceInvoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SOURCE_TYPES = ["freelance_project", "artist_event"];
const STATUSES = ["draft", "sent", "paid", "cancelled"];

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtMoney = (currency: string | null, v: string | null) =>
  v === null ? "—" : `${currency ?? ""} ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const fmtBdt = (v: string | null) =>
  v === null ? "—" : `BDT ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");

function statusVariant(status: string | null): "success" | "default" | "secondary" | "destructive" {
  if (status === "paid") return "success";
  if (status === "sent") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6,
  fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", whiteSpace: "nowrap" };

interface LineItemDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function FinanceInvoicesPage() {
  const [data, setData] = useState<InvoiceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [items, setItems] = useState<LineItemDraft[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [form, setForm] = useState({
    sourceType: "freelance_project",
    sourceId: "",
    clientId: "",
    currency: "BDT",
    exchangeRate: "",
    discount: "0",
    status: "draft",
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",
  });
  const [leads, setLeads] = useState<{ id: string; fullName: string | null; email: string | null }[]>([]);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/finance/invoices?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load invoices (${r.status})`);
        return json;
      })
      .then((res) => {
        if (!res || !Array.isArray(res.invoices)) throw new Error("Unexpected response from the invoices API");
        setData(res);
        setListError("");
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    // Picker options for the Client field — leads instead of a raw UUID
    // text input. (Source ID stays a text input: it is type-dependent —
    // a freelance project or an artist event — with no single list.)
    fetch("/api/leads?pageSize=200")
      .then((r) => r.json())
      .then((res) => setLeads(Array.isArray(res.leads) ? res.leads : []))
      .catch(() => setLeads([]));
  }, []);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const needsRate = form.currency.trim().toUpperCase() !== "BDT";

  const setItem = (idx: number, key: keyof LineItemDraft, value: string) =>
    setItems((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  const addItem = () => setItems((rows) => [...rows, { description: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (idx: number) => setItems((rows) => rows.filter((_, i) => i !== idx));

  const subtotal = items.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0), 0);
  const total = subtotal - (Number(form.discount) || 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (needsRate && !form.exchangeRate) {
      setFormError("Exchange rate is required for non-BDT invoices.");
      return;
    }
    const lineItems = items
      .filter((row) => row.description.trim() !== "")
      .map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity) || 0,
        unitPrice: Number(row.unitPrice) || 0,
      }));
    if (lineItems.length === 0) {
      setFormError("Add at least one line item with a description.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sourceType: form.sourceType,
        sourceId: form.sourceId.trim(),
        clientId: form.clientId.trim(),
        lineItems,
        currency: form.currency.trim().toUpperCase() || "BDT",
        status: form.status,
      };
      if (Number(form.discount) > 0) body.discount = Number(form.discount);
      if (needsRate) body.exchangeRate = Number(form.exchangeRate);
      if (form.issuedDate) body.issuedDate = form.issuedDate;
      if (form.dueDate) body.dueDate = form.dueDate;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to create invoice");
        return;
      }
      setDialogOpen(false);
      setItems([{ description: "", quantity: "1", unitPrice: "" }]);
      setForm({
        sourceType: "freelance_project",
        sourceId: "",
        clientId: "",
        currency: "BDT",
        exchangeRate: "",
        discount: "0",
        status: "draft",
        issuedDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        notes: "",
      });
      fetchInvoices();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Invoices</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} style={{ marginRight: 6 }} />New Invoice</Button>
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
      </div>

      {listError && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{listError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No invoices found</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Number</th>
                  <th style={thStyle}>Client / Source</th>
                  <th style={thStyle}>Issued</th>
                  <th style={thStyle}>Due</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total (BDT)</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>
                      <Link href={`/dashboard/finance/invoices/${inv.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                        {inv.invoiceNumber ?? shortId(inv.id)}
                      </Link>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }} title={inv.clientId ?? undefined}>{shortId(inv.clientId)}</span>
                      <span style={{ color: "var(--text-muted)" }}> · {labelOf(inv.sourceType)}</span>
                    </td>
                    <td style={tdStyle}>{fmtDate(inv.issuedDate)}</td>
                    <td style={tdStyle}>{fmtDate(inv.dueDate)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(inv.currency, inv.total)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtBdt(inv.totalBdt)}</td>
                    <td style={tdStyle}><Badge variant={statusVariant(inv.status)}>{labelOf(inv.status)}</Badge></td>
                    <td style={tdStyle}>
                      <Link href={`/dashboard/finance/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm"><ExternalLink size={14} /></Button>
                      </Link>
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
            {data.total} total invoices
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* Radix DialogContent has no max-height: without this the dialog is
            clipped on short/phone viewports and the submit button is unreachable. */}
        <DialogContent style={{ maxWidth: 720, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogDescription>The invoice number is generated automatically (INV-DDMMYY-serial). Totals are computed from the line items.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={labelStyle}>Source Type</label>
                <select value={form.sourceType} onChange={(e) => set("sourceType", e.target.value)} style={selectStyle}>
                  {SOURCE_TYPES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} style={selectStyle}>
                  {STATUSES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source ID (project / event UUID)</label>
                <Input value={form.sourceId} onChange={(e) => set("sourceId", e.target.value)} required placeholder="xxxxxxxx-xxxx-…" />
              </div>
              <div>
                <label style={labelStyle}>Client (lead)</label>
                <select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} style={selectStyle} required>
                  <option value="">Select lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName || l.email || l.id}
                    </option>
                  ))}
                </select>
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
                <label style={labelStyle}>Issued Date</label>
                <Input type="date" value={form.issuedDate} onChange={(e) => set("issuedDate", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label style={labelStyle}>Line Items</label>
              {/* Fixed 5-column row is wider than a phone: scroll inside the
                  dialog instead of clipping the qty/price inputs. */}
              <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 560 }}>
                {items.map((row, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 130px 110px 36px", gap: 8, alignItems: "center" }}>
                    <Input placeholder="Description" value={row.description} onChange={(e) => setItem(idx, "description", e.target.value)} />
                    <Input type="number" step="0.01" min="0" placeholder="Qty" value={row.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                    <Input type="number" step="0.01" min="0" placeholder="Unit price" value={row.unitPrice} onChange={(e) => setItem(idx, "unitPrice", e.target.value)} />
                    <div style={{ fontSize: 14, textAlign: "right", color: "var(--text-primary)" }}>
                      {((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeItem(idx)} disabled={items.length === 1}><Trash2 size={14} /></Button>
                  </div>
                ))}
              </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} style={{ marginTop: 10 }}>
                <Plus size={14} style={{ marginRight: 4 }} />Add Line Item
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Discount</label>
                <Input type="number" step="0.01" min="0" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
              </div>
              <div style={{ alignSelf: "end", textAlign: "right", fontSize: 14, color: "var(--text-primary)" }}>
                Subtotal {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} · <strong>Total {total.toLocaleString("en-US", { minimumFractionDigits: 2 })} {form.currency.toUpperCase()}</strong>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notes (optional)</label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>
            </div>

            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Invoice"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
