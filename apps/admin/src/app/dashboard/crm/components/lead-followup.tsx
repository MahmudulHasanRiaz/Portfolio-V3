"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@repo/ui";
import { LeadStatusBadge } from "../leads/[id]/components/lead-status-badge";

interface FollowUpLead {
  id: string;
  fullName: string | null;
  email: string | null;
  company: string | null;
  status: string;
  followUpDate: string | null;
  followUpNotes: string | null;
}

/**
 * Follow-up queue: leads whose follow-up date is today or past and whose
 * status is not terminal (won/lost/archived) — GET /api/leads/follow-up.
 * Before this tab existed the endpoint had no UI anywhere.
 */
export function LeadFollowUp({ refreshKey }: { refreshKey: number }) {
  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/leads/follow-up")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load the follow-up queue."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date + "T00:00:00") < today;
  };

  return (
    <div>
      {error && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No follow-ups due</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{ fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                    onClick={() => window.location.href = `/dashboard/crm/leads/${lead.id}`}
                  >
                    {lead.fullName || "Unnamed Lead"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {lead.email && <span>{lead.email}</span>}
                    {lead.company && <span>{lead.email ? " · " : ""}{lead.company}</span>}
                  </div>
                  {lead.followUpNotes && (
                    <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 4 }}>{lead.followUpNotes}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {lead.followUpDate && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue(lead.followUpDate) ? "var(--danger, #c0392b)" : "var(--text-primary)" }}>
                      {isOverdue(lead.followUpDate) ? "Overdue: " : "Due: "}
                      {new Date(lead.followUpDate + "T00:00:00").toLocaleDateString()}
                    </span>
                  )}
                  <LeadStatusBadge status={lead.status} size="sm" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
