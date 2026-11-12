"use client";

import { useState, useEffect } from "react";
import { Badge, Card, CardContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";

interface LeadRow {
  id: string;
  fullName: string | null;
  email: string | null;
  company: string | null;
  leadSource: string | null;
  status: string;
  createdAt: string | null;
}

const PIPELINE_STAGES = [
  "new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived",
];

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

interface LeadKanbanProps {
  refreshKey: number;
  onRefresh: () => void;
}

export function LeadKanban({ refreshKey, onRefresh }: LeadKanbanProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/leads?pageSize=200")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setLeads(data.leads ?? []);
      })
      .catch(() => setError("Could not load the pipeline."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Moving a card between stages is the board's job — without it the
  // pipeline was read-only and status could only change on the detail page.
  const handleMove = async (lead: LeadRow, newStatus: string) => {
    if (newStatus === lead.status) return;
    setError("");
    setMovingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? `Failed to move lead (${res.status})`);
        return;
      }
      onRefresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setMovingId(null);
    }
  };

  const grouped: Record<string, LeadRow[]> = {};
  for (const stage of PIPELINE_STAGES) {
    grouped[stage] = leads.filter((l) => l.status === stage);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading pipeline...</div>;
  }

  if (error && leads.length === 0) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--danger, #c0392b)" }}>{error}</div>;
  }

  return (
    <div>
      {error && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
    <div style={{ display: "flex", gap: 12, overflow: "auto", paddingBottom: 16, minHeight: 400 }}>
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = grouped[stage] || [];
        return (
          <div key={stage} style={{ minWidth: 240, maxWidth: 280, flex: 1 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              marginBottom: 8,
              borderRadius: 8,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: STAGE_COLORS[stage] || "var(--text-muted)",
              }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", textTransform: "capitalize" }}>
                {STAGE_LABELS[stage] || stage}
              </span>
              <Badge variant="outline" style={{ marginLeft: "auto" }}>{stageLeads.length}</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stageLeads.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 8 }}>
                  No leads
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <Card key={lead.id} style={{ cursor: "pointer" }}
                    onClick={() => window.location.href = `/dashboard/crm/leads/${lead.id}`}>
                    <CardContent style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
                        {lead.fullName || "Unnamed"}
                      </div>
                      {lead.email && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{lead.email}</div>
                      )}
                      {lead.company && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.company}</div>
                      )}
                      {lead.createdAt && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginBottom: 6 }}>
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      )}
                      {/* Stop the click reaching the card: opening the menu
                          must not navigate to the detail page. */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select value={lead.status} onValueChange={(v) => void handleMove(lead, v)} disabled={movingId === lead.id}>
                          <SelectTrigger style={{ width: "100%", height: 28, fontSize: 12 }}>
                            <SelectValue placeholder="Move to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s} value={s}>{STAGE_LABELS[s] || s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
