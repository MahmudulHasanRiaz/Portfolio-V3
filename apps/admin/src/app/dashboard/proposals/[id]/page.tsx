"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, Textarea } from "@repo/ui";
import { ArrowLeft, CheckCircle, XCircle, Send, FileText, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ProposalDocument {
  id: string;
  templateId: string | null;
  projectId: string | null;
  clientId: string | null;
  resolvedContent: string | null;
  status: string | null;
  version: number;
  parentDocumentId: string | null;
  pdfUrl: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

interface ProposalTemplate {
  id: string;
  name: string | null;
  type: string | null;
  clientType: string | null;
}

interface AcceptResult {
  document: ProposalDocument;
  projectId: string | null;
  projectCreated: boolean;
}

const labelOf = (s: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtDateTime = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");

function statusVariant(status: string | null): "success" | "default" | "secondary" | "destructive" {
  if (status === "accepted") return "success";
  if (status === "sent") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

const metaLabel: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 };
const metaValue: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)" };

export default function ProposalDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<ProposalDocument | null>(null);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [versions, setVersions] = useState<ProposalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/proposals/documents/${params.id}`).then((r) => r.json()),
      fetch(`/api/proposals/documents/${params.id}/versions`).then((r) => r.json()).catch(() => []),
    ])
      .then(([docJson, chainJson]) => {
        if (docJson.error) {
          setError(docJson.error);
          setDoc(null);
          return;
        }
        setDoc(docJson);
        setVersions(Array.isArray(chainJson) ? chainJson : []);
        if (docJson.templateId) {
          fetch(`/api/proposals/templates/${docJson.templateId}`)
            .then((r) => r.json())
            .then((tpl) => { if (!tpl.error) setTemplate(tpl); })
            .catch(() => setTemplate(null));
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const post = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Action failed");
    return json;
  };

  const run = async (fn: () => Promise<void>, okMessage: string) => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      await fn();
      setMessage(okMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = () =>
    run(async () => {
      const updated = await post(`/api/proposals/documents/${params.id}/send`);
      setDoc(updated);
    }, "Proposal marked as sent.");

  const handleAccept = async () => {
    setActionLoading(true);
    setMessage("");
    setError("");
    try {
      const result = (await post(`/api/proposals/documents/${params.id}/accept`)) as AcceptResult;
      setDoc(result.document);
      setMessage(
        result.projectCreated
          ? `Proposal accepted. Project auto-created (${result.projectId}).`
          : "Proposal accepted.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    run(async () => {
      const updated = await post(`/api/proposals/documents/${params.id}/reject`, { reason: rejectReason.trim() });
      setDoc(updated);
      setShowRejectForm(false);
      setRejectReason("");
    }, "Proposal rejected.");
  };

  const handleNewVersion = () =>
    run(async () => {
      const created = await post(`/api/proposals/documents/${params.id}/version`, {});
      router.push(`/dashboard/proposals/${created.id}`);
    }, "New version created.");

  const handlePdf = () =>
    run(async () => {
      const result = await post(`/api/proposals/documents/${params.id}/pdf`);
      if (result.pdfUrl) {
        setDoc((d) => (d ? { ...d, pdfUrl: result.pdfUrl } : d));
        window.open(result.pdfUrl, "_blank");
      }
    }, "Proposal PDF generated.");

  const handleDelete = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/proposals/documents/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/proposals");
    else setActionLoading(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!doc) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>{error || "Proposal document not found"}</div>;

  const isDraft = doc.status === "draft";
  const isSent = doc.status === "sent";

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/proposals")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {template?.name ?? "Proposal Document"}
        </h1>
        <Badge variant="secondary">v{doc.version}</Badge>
        <Badge variant={statusVariant(doc.status)}>{labelOf(doc.status)}</Badge>
      </div>

      {message && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--success-bg, #e6f4ea)", color: "var(--text-primary)", fontSize: 14 }}>{message}</div>
      )}
      {error && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)", color: "var(--text-primary)", fontSize: 14 }}>{error}</div>
      )}

      <Card style={{ marginBottom: 24 }}>
        <CardContent style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <div style={metaLabel}>Template</div>
              <div style={metaValue}>{template?.name ?? "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{labelOf(template?.type ?? null)}{template?.clientType ? ` · ${template.clientType}` : ""}</div>
            </div>
            <div>
              <div style={metaLabel}>Version</div>
              <div style={metaValue}>v{doc.version}</div>
              {doc.parentDocumentId && (
                <div style={{ fontSize: 12 }}>
                  Previous: <Link href={`/dashboard/proposals/${doc.parentDocumentId}`}>open parent document</Link>
                </div>
              )}
            </div>
            <div>
              <div style={metaLabel}>Client ID</div>
              <div style={{ ...metaValue, fontFamily: "monospace", fontSize: 12 }}>{doc.clientId ?? "—"}</div>
            </div>
            <div>
              <div style={metaLabel}>Project ID</div>
              <div style={{ ...metaValue, fontFamily: "monospace", fontSize: 12 }}>
                {doc.projectId ? <Link href={`/dashboard/freelance/${doc.projectId}`}>{doc.projectId}</Link> : "—"}
              </div>
            </div>
            <div>
              <div style={metaLabel}>Created</div>
              <div style={metaValue}>{fmtDateTime(doc.createdAt)}</div>
            </div>
            <div>
              <div style={metaLabel}>Sent</div>
              <div style={metaValue}>{doc.sentAt ? fmtDate(doc.sentAt) : "Not sent yet"}</div>
            </div>
            {doc.acceptedAt && (
              <div>
                <div style={metaLabel}>Accepted</div>
                <div style={metaValue}>{fmtDate(doc.acceptedAt)}</div>
              </div>
            )}
            {doc.rejectedAt && (
              <div>
                <div style={metaLabel}>Rejected</div>
                <div style={metaValue}>{fmtDate(doc.rejectedAt)}</div>
              </div>
            )}
          </div>

          {doc.rejectionReason && (
            <div style={{ padding: 12, borderRadius: 6, backgroundColor: "var(--danger-bg, #fdecea)" }}>
              <div style={metaLabel}>Rejection Reason</div>
              <div style={{ ...metaValue, whiteSpace: "pre-wrap" }}>{doc.rejectionReason}</div>
            </div>
          )}

          <div>
            <div style={{ ...metaLabel, marginBottom: 8 }}>Content</div>
            <div style={{ padding: 16, backgroundColor: "var(--muted, var(--bg-secondary))", borderRadius: 8, fontSize: 14, whiteSpace: "pre-wrap", color: "var(--text-primary)", maxHeight: 480, overflowY: "auto" }}>
              {doc.resolvedContent ?? "No content"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
            {isDraft && (
              <Button onClick={handleSend} disabled={actionLoading}>
                <Send size={14} style={{ marginRight: 6 }} />Send
              </Button>
            )}
            {isSent && (
              <>
                <Button onClick={handleAccept} disabled={actionLoading}>
                  <CheckCircle size={14} style={{ marginRight: 6 }} />Accept
                </Button>
                <Button variant="outline" onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading}>
                  <XCircle size={14} style={{ marginRight: 6 }} />Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleNewVersion} disabled={actionLoading}>
              <Copy size={14} style={{ marginRight: 6 }} />New Version
            </Button>
            <Button variant="outline" onClick={handlePdf} disabled={actionLoading}>
              <FileText size={14} style={{ marginRight: 6 }} />Generate PDF
            </Button>
            {doc.pdfUrl && (
              <Link href={doc.pdfUrl} target="_blank" style={{ fontSize: 14 }}>View PDF</Link>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(true)} disabled={actionLoading}>
              <Trash2 size={14} style={{ marginRight: 6 }} />Delete
            </Button>
          </div>

          {showRejectForm && (
            <div style={{ padding: 16, backgroundColor: "var(--muted, var(--bg-secondary))", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-primary)" }}>Reason for rejection (required):</div>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this proposal being rejected?"
                rows={3}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>Submit Rejection</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {versions.length > 1 && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Version History</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {versions.map((v) => (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
                    <strong>v{v.version}</strong>
                    <span style={{ color: "var(--text-muted)" }}> · {fmtDateTime(v.createdAt)}</span>
                    {v.id === doc.id && <span style={{ color: "var(--text-muted)" }}> · current</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant={statusVariant(v.status)}>{labelOf(v.status)}</Badge>
                    {v.id !== doc.id && (
                      <Link href={`/dashboard/proposals/${v.id}`}>
                        <Button variant="outline" size="sm">Open</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete proposal document"
        message="Delete this proposal document? This cannot be undone."
        onConfirm={() => void handleDelete()}
        busy={actionLoading}
        busyLabel="Deleting..."
      />
    </div>
  );
}
