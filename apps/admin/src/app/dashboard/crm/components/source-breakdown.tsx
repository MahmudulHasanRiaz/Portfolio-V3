"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

const SOURCE_LABELS: Record<string, string> = {
  contact_form: "Contact Form",
  consultation_form: "Consultation Form",
  hiring_form: "Hiring Form",
  artist_booking_form: "Artist Booking",
  partnership_form: "Partnership",
  newsletter_conversion: "Newsletter",
  manual_entry: "Manual Entry",
  imported_lead: "Imported",
  unknown: "Unknown",
};

interface StatsResponse {
  total: number;
  bySource: { source: string; count: number }[];
}

export function SourceBreakdown() {
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/leads/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: StatsResponse) => {
        setSources([...(data.bySource ?? [])].sort((a, b) => b.count - a.count));
        setTotal(data.total ?? 0);
      })
      .catch(() => setError("Could not load lead sources."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: "center", padding: 24, color: "var(--danger, #c0392b)" }}>{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sources.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No data yet</div>
          ) : (
            sources.map((s) => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.source}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-primary)" }}>{SOURCE_LABELS[s.source] || s.source}</span>
                    <span style={{ color: "var(--text-muted)" }}>{s.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: "var(--bg-muted)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "var(--brand)", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
