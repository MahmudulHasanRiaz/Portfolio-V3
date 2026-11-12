"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, Textarea } from "@repo/ui";
import { ArrowLeft, CheckCircle, XCircle, FileText } from "lucide-react";

interface Proposal {
  id: string; title: string | null; proposalType: string; status: string;
  content: Record<string, unknown> | null; fileUrl: string | null;
  sentAt: string | null; acceptedAt: string | null; rejectedAt: string | null;
  rejectionReason: string | null; createdAt: string | null;
}

export default function PortalProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/proposals/${params.id}`)
      .then((r) => r.json())
      .then(setProposal)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleAccept() {
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/proposals/${params.id}/accept`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setProposal(updated);
        setMessage("Proposal accepted!");
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to accept");
      }
    } catch {
      setMessage("Connection error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/proposals/${params.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProposal(updated);
        setMessage("Proposal rejected.");
        setShowRejectForm(false);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to reject");
      }
    } catch {
      setMessage("Connection error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!proposal) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Proposal not found</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/proposals")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {proposal.title || "Proposal"}
        </h1>
        <Badge variant={proposal.status === "accepted" ? "success" : proposal.status === "rejected" ? "destructive" : "default"}>
          {proposal.status}
        </Badge>
      </div>

      {message && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--success)", color: "var(--success-foreground)" }}>
          {message}
        </div>
      )}

      <Card style={{ marginBottom: 24 }}>
        <CardContent style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Type</div>
              <div style={{ fontSize: 14 }}>{proposal.proposalType}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Status</div>
              <div style={{ fontSize: 14 }}>{proposal.status}</div>
            </div>
          </div>

          {proposal.content && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>Content</div>
              <div style={{ padding: 16, backgroundColor: "var(--muted)", borderRadius: 8, fontSize: 14, whiteSpace: "pre-wrap" }}>
                {typeof proposal.content === "object" ? JSON.stringify(proposal.content, null, 2) : String(proposal.content)}
              </div>
            </div>
          )}

          {proposal.fileUrl && (
            <div>
              <a href={proposal.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm"><FileText size={14} style={{ marginRight: 4 }} />View Document</Button>
              </a>
            </div>
          )}

          {proposal.status === "sent" && (
            <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <Button onClick={handleAccept} disabled={actionLoading}>
                <CheckCircle size={16} style={{ marginRight: 6 }} />{actionLoading ? "Processing..." : "Accept"}
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading}>
                <XCircle size={16} style={{ marginRight: 6 }} />Decline
              </Button>
            </div>
          )}

          {showRejectForm && (
            <div style={{ padding: 16, backgroundColor: "var(--muted)", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Reason for declining (required):</div>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                <Button size="sm" variant="outline" onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading}>
                  Submit Decline
                </Button>
              </div>
            </div>
          )}

          {proposal.rejectionReason && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Rejection Reason</div>
              <div style={{ fontSize: 14 }}>{proposal.rejectionReason}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
