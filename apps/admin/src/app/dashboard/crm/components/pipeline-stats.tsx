"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const STAGE_COLORS: Record<string, string> = {
  new: "var(--brand)",
  contacted: "var(--accent-9)",
  qualified: "var(--accent-10)",
  proposal_sent: "var(--warning)",
  negotiation: "var(--warning)",
  won: "var(--success)",
  lost: "var(--destructive)",
  archived: "var(--text-muted)",
};

const PIPELINE_ORDER = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"];

interface StatsResponse {
  total: number;
  converted: number;
  conversionRate: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export function PipelineStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/leads/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setStats(data))
      .catch(() => setError("Could not load pipeline stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: "center", padding: 24, color: "var(--danger, #c0392b)" }}>{error || "No stats available"}</div>
        </CardContent>
      </Card>
    );
  }

  const counts: Record<string, number> = {};
  stats.byStatus.forEach((c) => { counts[c.status] = c.count; });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Total Leads</span>
            <Badge>{stats.total}</Badge>
          </div>
          {PIPELINE_ORDER.map((stage) => (
            <div key={stage} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: STAGE_COLORS[stage] || "var(--text-muted)" }} />
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{STAGE_LABELS[stage] || stage}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{counts[stage] || 0}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", marginTop: 4 }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Conversion Rate</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--success)" }}>
              {stats.conversionRate}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
