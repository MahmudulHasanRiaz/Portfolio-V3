"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";
import { Receipt } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  sourceType: string;
  sourceId: string | null;
  total: string | null;
  currency: string | null;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
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

function getStatusConfig(status: string) {
  return statusConfig[status] || { variant: "secondary" as const, label: status };
}

export default function PortalInvoicesListPage() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/invoices?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res.invoices || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Invoices</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <Receipt size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No invoices found</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((inv) => {
            const cfg = getStatusConfig(inv.status);
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {inv.invoiceNumber || `Invoice ${inv.id.substring(0, 8)}`}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 16 }}>
                        {inv.projectTitle && <span>Project: {inv.projectTitle}</span>}
                        {inv.dueDate && <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>}
                        {inv.issuedDate && <span>Issued: {new Date(inv.issuedDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {inv.currency || "USD"} {inv.total || "0.00"}
                      </span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
