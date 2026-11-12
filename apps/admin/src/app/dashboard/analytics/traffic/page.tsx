"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@repo/ui";

interface TrafficSummary {
  totalVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
}

export default function TrafficPage() {
  const [data, setData] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fmtDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/summary?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Traffic Summary</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Overview of site traffic metrics</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: "6px 14px", borderRadius: 6, border: days === d ? "2px solid var(--accent-info)" : "1px solid var(--border)", background: days === d ? "var(--accent-info)" : "transparent", color: days === d ? "#fff" : "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : data ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Visitors</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data.totalVisitors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Page Views</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data.totalPageViews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Sessions</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data.totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Avg. Session Duration</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{fmtDuration(data.averageSessionDuration)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Bounce Rate</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data.bounceRate}%</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>No data yet. Start tracking to see results.</p>
      )}
    </div>
  );
}
