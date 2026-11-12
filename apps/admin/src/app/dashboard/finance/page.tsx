"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@repo/ui";
import Link from "next/link";

interface MonthlyTrendPoint {
  month: string;
  incomeBdt: number;
  expensesBdt: number;
}

interface GlobalFinanceSummary {
  totalIncomeBdt: number;
  currentMonthIncomeBdt: number;
  totalExpensesBdt: number;
  currentMonthExpensesBdt: number;
  netProfitBdt: number;
  incomeBySourceType: { sourceType: string | null; totalBdt: number }[];
  topClients: { clientId: string; totalBdt: number }[];
  monthlyTrend: MonthlyTrendPoint[];
}

const fmtBdt = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : `BDT ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export default function FinanceOverviewPage() {
  const [summary, setSummary] = useState<GlobalFinanceSummary | null>(null);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/finance/summary")
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setSummary(res);
      })
      .catch(() => setError("Failed to load finance summary"))
      .finally(() => setLoading(false));
    // Top Clients arrives as lead UUIDs; resolve them to names so the
    // section is readable instead of showing raw id fragments.
    fetch("/api/leads?pageSize=100")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const names: Record<string, string> = {};
        for (const lead of res?.leads ?? []) {
          if (lead?.id && lead?.fullName) names[lead.id] = lead.fullName;
        }
        setLeadNames(names);
      })
      .catch(() => {});
  }, []);

  const cards = [
    { title: "Total Income", value: summary?.totalIncomeBdt, href: "/dashboard/finance/payments" },
    { title: "Income (This Month)", value: summary?.currentMonthIncomeBdt, href: "/dashboard/finance/payments" },
    { title: "Total Expenses", value: summary?.totalExpensesBdt, href: "/dashboard/finance/expenses" },
    { title: "Expenses (This Month)", value: summary?.currentMonthExpensesBdt, href: "/dashboard/finance/expenses" },
    { title: "Net Profit", value: summary?.netProfitBdt, href: "/dashboard/finance/invoices" },
  ];

  const maxTrend = summary
    ? Math.max(1, ...summary.monthlyTrend.map((p) => Math.max(p.incomeBdt, p.expensesBdt)))
    : 1;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Finance
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        All totals are in BDT (base currency). Foreign-currency transactions are converted at their recorded exchange rate.
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--danger, #c0392b)" }}>{error}</div>
      ) : !summary ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No finance data yet</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {cards.map((card) => (
              <Link key={card.title} href={card.href} style={{ textDecoration: "none" }}>
                <Card>
                  <CardContent style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{card.title}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{fmtBdt(card.value)}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Income by Source</h2>
              {summary.incomeBySourceType.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No income recorded yet</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 280 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Source</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Total (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.incomeBySourceType.map((row) => (
                      <tr key={row.sourceType ?? "unknown"}>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>{labelOf(row.sourceType)}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-primary)" }}>{fmtBdt(row.totalBdt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Top Clients</h2>
              {summary.topClients.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No client payments yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {summary.topClients.map((client) => (
                    <Card key={client.clientId}>
                      <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", gap: 12 }}>
                        <span style={{ fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={client.clientId}>
                          {leadNames[client.clientId] ?? shortId(client.clientId)}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{fmtBdt(client.totalBdt)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Monthly Trend (last 12 months)</h2>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Month</th>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, width: "35%" }}>Income</th>
                <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Income (BDT)</th>
                <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Expenses (BDT)</th>
                <th style={{ textAlign: "right", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>Net (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {summary.monthlyTrend.map((point) => (
                <tr key={point.month}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>{point.month}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ height: 8, borderRadius: 4, backgroundColor: "var(--success, #2e7d32)", width: `${Math.round((point.incomeBdt / maxTrend) * 100)}%`, minWidth: point.incomeBdt > 0 ? 4 : 0 }} />
                      <div style={{ height: 8, borderRadius: 4, backgroundColor: "var(--danger, #c0392b)", width: `${Math.round((point.expensesBdt / maxTrend) * 100)}%`, minWidth: point.expensesBdt > 0 ? 4 : 0 }} />
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-primary)" }}>{fmtBdt(point.incomeBdt)}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-primary)" }}>{fmtBdt(point.expensesBdt)}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-primary)" }}>{fmtBdt(point.incomeBdt - point.expensesBdt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
