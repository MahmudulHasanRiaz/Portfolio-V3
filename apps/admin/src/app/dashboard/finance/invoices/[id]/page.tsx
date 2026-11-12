"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent } from "@repo/ui";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  createdBy: string | null;
  createdAt: string | null;
}

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtDateTime = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");
const fmtNum = (v: string | number | null) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoney = (currency: string | null, v: string | null) =>
  v === null ? "—" : `${currency ?? ""} ${fmtNum(v)}`.trim();

function statusVariant(status: string | null): "success" | "default" | "secondary" | "destructive" {
  if (status === "paid") return "success";
  if (status === "sent") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

// Allowed next statuses per current status (draft → sent → paid, cancel from draft/sent).
const NEXT_STATUSES: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };
const metaLabel: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 };
const metaValue: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)" };

export default function FinanceInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<FinanceInvoice | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fetchInvoice = useCallback(() => {
    setLoading(true);
    fetch(`/api/finance/invoices/${params.id}`)
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? `Failed to load invoice (${r.status})`);
        return json;
      })
      .then((res) => {
        setInvoice(res);
        if (res.clientId) {
          fetch(`/api/leads/${res.clientId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((lead) => { if (lead?.fullName) setClientName(lead.fullName); })
            .catch(() => {});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const changeStatus = async (status: string) => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/finance/invoices/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update status");
        return;
      }
      setInvoice(json);
      setMessage(`Invoice marked as ${status}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const generatePdf = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/finance/invoices/${params.id}/pdf`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Failed to generate PDF");
        return;
      }
      if (json?.pdfUrl) {
        setInvoice((inv) => (inv ? { ...inv, pdfUrl: json.pdfUrl } : inv));
        window.open(json.pdfUrl, "_blank");
        setMessage("Invoice PDF generated.");
      } else {
        setError("PDF was generated but no download URL was returned. Try again.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    setError("");
    const res = await fetch(`/api/finance/invoices/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/finance/invoices");
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error ?? `Failed to delete invoice (${res.status})`);
    setActionLoading(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!invoice) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>{error || "Invoice not found"}</div>;

  const isForeign = (invoice.currency ?? "BDT").toUpperCase() !== "BDT";
  const nextStatuses = NEXT_STATUSES[invoice.status ?? ""] ?? [];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/finance/invoices")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1, fontFamily: "monospace" }}>
          {invoice.invoiceNumber ?? "Invoice"}
        </h1>
        <Badge variant={statusVariant(invoice.status)}>{labelOf(invoice.status)}</Badge>
      </div>

      {message && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--success-bg, #e6f4ea)", color: "var(--text-primary)", fontSize: 14 }}>{message}</div>
      )}
      {error && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{error}</div>
      )}

      <Card style={{ marginBottom: 24 }}>
        <CardContent style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <div style={metaLabel}>Client</div>
              <div style={metaValue}>{clientName ?? "—"}</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{invoice.clientId ?? ""}</div>
            </div>
            <div>
              <div style={metaLabel}>Source</div>
              <div style={metaValue}>{labelOf(invoice.sourceType)}</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{invoice.sourceId ?? ""}</div>
            </div>
            <div>
              <div style={metaLabel}>Issued</div>
              <div style={metaValue}>{fmtDate(invoice.issuedDate)}</div>
            </div>
            <div>
              <div style={metaLabel}>Due</div>
              <div style={metaValue}>{fmtDate(invoice.dueDate)}</div>
            </div>
            <div>
              <div style={metaLabel}>Currency</div>
              <div style={metaValue}>{invoice.currency ?? "BDT"}</div>
            </div>
            <div>
              <div style={metaLabel}>Created</div>
              <div style={metaValue}>{fmtDateTime(invoice.createdAt)}</div>
            </div>
          </div>

          <div>
            <div style={{ ...metaLabel, marginBottom: 8 }}>Line Items</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Quantity</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Unit Price</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems ?? []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(item.quantity)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(item.unitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(item.total)}</td>
                  </tr>
                ))}
                {(invoice.lineItems ?? []).length === 0 && (
                  <tr><td style={tdStyle} colSpan={4}>No line items</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ alignSelf: "flex-end", minWidth: 280, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "var(--text-muted)" }}>
              <span>Subtotal</span><span style={{ color: "var(--text-primary)" }}>{fmtMoney(invoice.currency, invoice.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "var(--text-muted)" }}>
              <span>Discount</span><span style={{ color: "var(--text-primary)" }}>{fmtMoney(invoice.currency, invoice.discount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", fontWeight: 700, color: "var(--text-primary)" }}>
              <span>Total</span><span>{fmtMoney(invoice.currency, invoice.total)}</span>
            </div>
            {isForeign && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 6, backgroundColor: "var(--muted, var(--bg-secondary))", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Exchange Rate</span>
                  <span style={{ color: "var(--text-primary)" }}>{invoice.exchangeRate ? `1 ${invoice.currency} = BDT ${fmtNum(invoice.exchangeRate)}` : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text-primary)" }}>
                  <span>Total (BDT)</span><span>BDT {fmtNum(invoice.totalBdt)}</span>
                </div>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div>
              <div style={metaLabel}>Notes</div>
              <div style={{ ...metaValue, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
            {nextStatuses.map((s) => (
              <Button key={s} variant={s === "cancelled" ? "outline" : "default"} onClick={() => changeStatus(s)} disabled={actionLoading}>
                Mark as {labelOf(s)}
              </Button>
            ))}
            <Button variant="outline" onClick={generatePdf} disabled={actionLoading}>
              <FileText size={14} style={{ marginRight: 6 }} />Generate PDF
            </Button>
            {invoice.pdfUrl && (
              <Link href={invoice.pdfUrl} target="_blank" style={{ fontSize: 14 }}>
                View current PDF
              </Link>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(true)} disabled={actionLoading}>
              <Trash2 size={14} style={{ marginRight: 6 }} />Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete invoice"
        message="Delete this invoice? This cannot be undone."
        onConfirm={() => void handleDelete()}
        busy={actionLoading}
        busyLabel="Deleting..."
      />
    </div>
  );
}
