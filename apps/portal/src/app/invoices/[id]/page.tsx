"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { ArrowLeft, Download, Calendar, DollarSign, FileText } from "lucide-react";

interface LineItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  sourceType: string;
  sourceId: string | null;
  clientId: string | null;
  lineItems: LineItem[] | Record<string, unknown> | null;
  subtotal: string | null;
  discount: string | null;
  total: string | null;
  currency: string | null;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string | null;
  projectTitle: string | null;
}

const statusConfig: Record<string, { variant: "success" | "default" | "warning" | "destructive" | "secondary"; label: string }> = {
  paid: { variant: "success", label: "Paid" },
  sent: { variant: "default", label: "Sent" },
  draft: { variant: "secondary", label: "Draft" },
  overdue: { variant: "destructive", label: "Overdue" },
  cancelled: { variant: "secondary", label: "Cancelled" },
  pending: { variant: "warning", label: "Pending" },
};

function renderLineItems(items: unknown): LineItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items as LineItem[];
  if (typeof items === "object" && items !== null) {
    const obj = items as Record<string, unknown>;
    if (obj.items && Array.isArray(obj.items)) return obj.items as LineItem[];
  }
  return [];
}

export default function PortalInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!invoice) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Invoice not found</div>;

  const cfg = statusConfig[invoice.status] || { variant: "secondary" as const, label: invoice.status };
  const lineItems = renderLineItems(invoice.lineItems);

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {invoice.invoiceNumber || `Invoice ${invoice.id.substring(0, 8)}`}
        </h1>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <CardContent style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={14} /> Issued Date
              </div>
              <div style={{ fontSize: 14 }}>{invoice.issuedDate ? new Date(invoice.issuedDate).toLocaleDateString() : "Not set"}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={14} /> Due Date
              </div>
              <div style={{ fontSize: 14 }}>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Not set"}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <DollarSign size={14} /> Total Amount
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                {invoice.currency || "USD"} {invoice.total || "0.00"}
              </div>
            </div>
            {invoice.projectTitle && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <FileText size={14} /> Project
                </div>
                <div style={{ fontSize: 14 }}>{invoice.projectTitle}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {lineItems.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Unit Price</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14 }}>{item.description || "Item"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "right" }}>{item.quantity ?? "-"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "right" }}>
                      {item.unitPrice != null ? `${invoice.currency || "USD"} ${item.unitPrice.toFixed(2)}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "right", fontWeight: 600 }}>
                      {item.amount != null ? `${invoice.currency || "USD"} ${item.amount.toFixed(2)}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {invoice.subtotal && (
                  <tr>
                    <td colSpan={3} style={{ padding: "12px 16px", fontSize: 14, textAlign: "right", color: "var(--text-muted)" }}>Subtotal</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "right" }}>{invoice.currency || "USD"} {invoice.subtotal}</td>
                  </tr>
                )}
                {invoice.discount && parseFloat(invoice.discount) > 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "12px 16px", fontSize: 14, textAlign: "right", color: "var(--text-muted)" }}>Discount</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, textAlign: "right", color: "var(--destructive)" }}>- {invoice.currency || "USD"} {invoice.discount}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} style={{ padding: "12px 16px", fontSize: 16, textAlign: "right", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "12px 16px", fontSize: 16, textAlign: "right", fontWeight: 700 }}>{invoice.currency || "USD"} {invoice.total || "0.00"}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          </CardContent>
        </Card>
      )}

      {invoice.pdfUrl && (
        <div style={{ display: "flex", gap: 8 }}>
          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Button variant="outline">
              <Download size={14} style={{ marginRight: 4 }} />Download PDF
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
