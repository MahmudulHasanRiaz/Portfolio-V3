"use client";

import { useEffect, useState } from "react";

interface UTMPerformance {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  visits: number;
  leads: number;
}

export default function UTMPage() {
  const [data, setData] = useState<UTMPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/utm?limit=20&days=${days}`)
      .then(r => r.json())
      .then(d => setData(d.utmData || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>UTM Performance</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Campaign performance by UTM parameters</p>
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
      ) : data.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No data yet. Start tracking to see results.</p>
      ) : (
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Source</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Medium</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Campaign</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Visits</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Leads</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-primary)" }}>{item.utmSource}</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-primary)" }}>{item.utmMedium}</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-primary)" }}>{item.utmCampaign}</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", textAlign: "right" }}>{item.visits}</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", textAlign: "right" }}>{item.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
