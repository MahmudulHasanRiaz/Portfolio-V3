"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@repo/ui";
import { Trash2, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AbandonedLead {
  id: string;
  email: string | null;
  phone: string | null;
  sourcePage: string | null;
  metadata: Record<string, unknown> | null;
  capturedAt: string;
}

interface RecoveryQueueProps {
  refreshKey: number;
  onRecovered?: () => void;
}

export function RecoveryQueue({ refreshKey, onRecovered }: RecoveryQueueProps) {
  const [leads, setLeads] = useState<AbandonedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const fetchLeads = () => {
    setLoading(true);
    setError("");
    fetch("/api/abandoned")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Could not load abandoned leads."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/abandoned/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchLeads();
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error ?? `Failed to delete abandoned lead (${res.status})`);
  };

  const displayName = (lead: AbandonedLead) => {
    const metaName = lead.metadata?.name;
    if (typeof metaName === "string" && metaName.trim()) return metaName.trim();
    return lead.email || lead.phone || "Unknown";
  };

  // Recover turns an abandoned capture into a real lead (manual entry,
  // with the capture page recorded in the message), then removes it
  // from the queue. Nothing is invented: no name is guessed when the
  // capture has none — the lead is created with the captured contact.
  const handleRecover = async (lead: AbandonedLead) => {
    setError("");
    setRecoveringId(lead.id);
    try {
      const metaName = lead.metadata?.name;
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: typeof metaName === "string" && metaName.trim() ? metaName.trim() : null,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          leadSource: "manual_entry",
          message: `Recovered from abandoned lead captured on ${lead.sourcePage ?? "unknown page"}.`,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? `Failed to recover lead (${res.status})`);
        return;
      }
      const del = await fetch(`/api/abandoned/${lead.id}`, { method: "DELETE" });
      if (!del.ok) {
        setError("Lead was created, but the abandoned entry could not be removed. Refresh to check the queue.");
        return;
      }
      fetchLeads();
      onRecovered?.();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setRecoveringId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abandoned Lead Recovery</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No abandoned leads to recover</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                      {displayName(lead)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {lead.email && displayName(lead) !== lead.email && <span>{lead.email}</span>}
                      {lead.phone && <span>{lead.email && displayName(lead) !== lead.email ? " · " : ""}{lead.phone}</span>}
                      {lead.sourcePage && <span> · From: {lead.sourcePage}</span>}
                      {lead.capturedAt && <span> · {new Date(lead.capturedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recoveringId === lead.id}
                      onClick={() => void handleRecover(lead)}
                    >
                      <UserPlus size={14} style={{ marginRight: 4 }} />
                      {recoveringId === lead.id ? "Recovering..." : "Recover"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(lead.id)} aria-label="Delete abandoned lead">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete abandoned lead"
        message="Delete this abandoned lead? This cannot be undone."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </Card>
  );
}
