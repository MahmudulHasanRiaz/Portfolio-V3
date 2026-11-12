"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { BarChart3, Search, TrendingUp, Eye } from "lucide-react";

interface SearchAnalytics {
  popularQueries: { query: string; count: number }[];
  totalQueries: number;
  queriesByType: { entityType: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
}

export default function SearchStatisticsPage() {
  const [data, setData] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/search/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && typeof res.totalQueries === "number") setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalQueries = data?.totalQueries ?? 0;
  const zeroResultTotal = (data?.zeroResultQueries ?? []).reduce((s, q) => s + q.count, 0);
  const topQuery = data?.popularQueries?.[0];

  const stats = [
    { label: "Total Queries", value: loading ? "…" : String(totalQueries), icon: Search, desc: "Aggregate search query count" },
    { label: "Popular Searches", value: loading ? "…" : topQuery ? `${topQuery.query} (${topQuery.count})` : "—", icon: TrendingUp, desc: "Most searched term" },
    { label: "Click-through Rate", value: "—", icon: Eye, desc: "Clicks are not tracked yet" },
    { label: "Zero-Result Queries", value: loading ? "…" : String(zeroResultTotal), icon: BarChart3, desc: "Queries returning no results" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Search Statistics
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Search analytics and usage metrics
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader style={{ padding: "16px 16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <s.icon size={16} style={{ color: "var(--text-muted)" }} />
                <CardTitle style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>
                  {s.label}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: "8px 16px 16px" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.value}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {s.desc}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && (!data || totalQueries === 0) ? (
        <Card>
          <CardContent style={{ padding: 32, textAlign: "center" }}>
            <BarChart3 size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Analytics Tracking Inactive
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto" }}>
              Search analytics data is being populated as users interact with the site search.
              Statistics will appear here once search tracking has collected enough data.
            </div>
          </CardContent>
        </Card>
      ) : (
        data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            <Card>
              <CardHeader><CardTitle>Popular Searches</CardTitle></CardHeader>
              <CardContent>
                {data.popularQueries.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-muted)" }}>No searches yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.popularQueries.slice(0, 10).map((q) => (
                      <div key={q.query} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "var(--text-primary)" }}>{q.query}</span>
                        <span style={{ color: "var(--text-muted)" }}>{q.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Zero-Result Queries</CardTitle></CardHeader>
              <CardContent>
                {data.zeroResultQueries.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-muted)" }}>No zero-result queries</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.zeroResultQueries.slice(0, 10).map((q) => (
                      <div key={q.query} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "var(--text-primary)" }}>{q.query}</span>
                        <span style={{ color: "var(--text-muted)" }}>{q.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Queries by Content Type</CardTitle></CardHeader>
              <CardContent>
                {data.queriesByType.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-muted)" }}>No typed queries yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.queriesByType.map((q) => (
                      <div key={q.entityType} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "var(--text-primary)" }}>{q.entityType}</span>
                        <span style={{ color: "var(--text-muted)" }}>{q.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
