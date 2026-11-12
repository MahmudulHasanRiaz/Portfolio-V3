"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Input, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@repo/ui";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface PaymentMethod {
  id: string;
  name: string | null;
  type: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TYPES = ["mobile_banking", "bank", "cash", "international"];

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

export default function PaymentMethodsSettingsPage() {
  const [data, setData] = useState<PaymentMethodListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", type: "mobile_banking", isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchMethods = useCallback(() => {
    setLoading(true);
    fetch("/api/finance/payment-methods?pageSize=100")
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load payment methods (${r.status})`);
        return json;
      })
      .then((res) => {
        if (!res || !Array.isArray(res.paymentMethods)) throw new Error("Unexpected response from the payment-methods API");
        setData(res);
        setListError("");
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load payment methods"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "mobile_banking", isActive: true });
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({ name: m.name ?? "", type: m.type ?? "mobile_banking", isActive: m.isActive !== false });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const body = { name: form.name.trim(), type: form.type, isActive: form.isActive };
      const res = await fetch(
        editing ? `/api/finance/payment-methods/${editing.id}` : "/api/finance/payment-methods",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(json?.error ?? "Failed to save payment method");
        return;
      }
      setDialogOpen(false);
      fetchMethods();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: PaymentMethod) => {
    const res = await fetch(`/api/finance/payment-methods/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: m.isActive === false ? true : false }),
    });
    if (res.ok) {
      fetchMethods();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to update payment method (${res.status})`);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/payment-methods/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchMethods();
      return;
    }
    const json = await res.json().catch(() => null);
    setListError(json?.error ?? `Failed to delete payment method (${res.status})`);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>Payment Methods</h1>
        <Button onClick={openCreate}><Plus size={16} style={{ marginRight: 6 }} />New Method</Button>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, marginLeft: 44 }}>
        Methods available when logging payments and expenses (e.g. bKash, Bank Transfer, Cash, PayPal).
      </p>

      {listError && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{listError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.paymentMethods.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No payment methods yet. Create your first one.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data.paymentMethods.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.name ?? "—"}</td>
                  <td style={tdStyle}>{labelOf(m.type)}</td>
                  <td style={tdStyle}>
                    <Badge variant={m.isActive === false ? "secondary" : "success"}>{m.isActive === false ? "Inactive" : "Active"}</Badge>
                  </td>
                  <td style={tdStyle}>{fmtDate(m.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="outline" size="sm" onClick={() => openEdit(m)}><Pencil size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(m)}>{m.isActive === false ? "Activate" : "Deactivate"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(m.id)}><Trash2 size={14} /></Button>
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
        <DialogContent style={{ maxWidth: 480, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Payment Method" : "New Payment Method"}</DialogTitle>
            <DialogDescription>Payment methods appear in the payment and expense forms.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={100}
                  placeholder="e.g. bKash"
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  style={selectStyle}
                >
                  {TYPES.map((t) => <option key={t} value={t}>{labelOf(t)}</option>)}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active (available in forms)
              </label>
            </div>
            {formError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginTop: 12 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Method"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete payment method"
        message="Delete this payment method? Existing payments keep their recorded method reference."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
