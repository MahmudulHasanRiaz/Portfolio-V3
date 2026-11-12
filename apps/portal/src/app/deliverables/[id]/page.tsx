"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { ArrowLeft, Download, Send } from "lucide-react";

interface Deliverable {
  id: string; projectId: string; title: string | null; fileUrl: string | null;
  notes: string | null; status: string; clientFeedback: string | null;
  submittedAt: string | null; approvedAt: string | null;
}

export default function PortalDeliverableDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/deliverables/${params.id}`)
      .then((r) => r.json())
      .then(setDeliverable)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmitFeedback() {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/deliverables/${params.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        setMessage("Feedback submitted. Status updated to revision requested.");
        setFeedback("");
        const updated = await res.json();
        setDeliverable(updated);
      } else {
        setMessage("Failed to submit feedback");
      }
    } catch {
      setMessage("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!deliverable) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Deliverable not found</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/deliverables")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{deliverable.title || "Deliverable"}</h1>
        <Badge variant={deliverable.status === "approved" ? "success" : deliverable.status === "submitted" ? "default" : "warning"}>
          {deliverable.status?.replace(/_/g, " ")}
        </Badge>
      </div>

      {message && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--success)", color: "var(--success-foreground)" }}>{message}</div>}

      <Card style={{ marginBottom: 24 }}>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24 }}>
          {deliverable.notes && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 14 }}>{deliverable.notes}</div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Submitted</div>
              <div style={{ fontSize: 14 }}>{deliverable.submittedAt ? new Date(deliverable.submittedAt).toLocaleDateString() : "Not yet"}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Approved</div>
              <div style={{ fontSize: 14 }}>{deliverable.approvedAt ? new Date(deliverable.approvedAt).toLocaleDateString() : "Pending"}</div>
            </div>
          </div>
          {deliverable.fileUrl && (
            <div style={{ marginTop: 8 }}>
              <a href={deliverable.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm"><Download size={14} style={{ marginRight: 4 }} />Download File</Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {deliverable.status !== "approved" && (
        <Card>
          <CardHeader><CardTitle>Submit Feedback</CardTitle></CardHeader>
          <CardContent>
            {deliverable.clientFeedback && (
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: "var(--muted)", borderRadius: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Previous feedback:</div>
                <div style={{ fontSize: 14 }}>{deliverable.clientFeedback}</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter your feedback or revision request..."
                rows={4}
                style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)", width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || !feedback.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 500, backgroundColor: "var(--accent)", color: "var(--accent-foreground)", border: "none", cursor: submitting || !feedback.trim() ? "not-allowed" : "pointer", opacity: submitting || !feedback.trim() ? 0.6 : 1 }}
                >
                  <Send size={14} />{submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
