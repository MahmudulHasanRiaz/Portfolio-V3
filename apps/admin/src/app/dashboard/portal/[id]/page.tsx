"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { ArrowLeft, RefreshCw, XCircle, Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface PortalSessionDetail {
  id: string;
  projectId: string;
  portalToken: string;
  clientEmail: string | null;
  passwordHash: string | null;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  projectTitle?: string;
}

export default function PortalSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PortalSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const fetchSession = () => {
    setLoading(true);
    fetch(`/api/portal/sessions/${params.id}`)
      .then((r) => r.json())
      .then(setSession)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSession(); }, [params.id]);

  async function handleRegenerateToken() {
    setMessage("");
    try {
      const res = await fetch(`/api/portal/sessions/${params.id}/regenerate-token`, { method: "POST" });
      if (res.ok) {
        setMessageType("success");
        setMessage("Token regenerated! Share the new token with your client.");
        fetchSession();
      } else {
        const err = await res.json();
        setMessageType("error");
        setMessage(err.error || "Failed to regenerate");
      }
    } catch {
      setMessageType("error");
      setMessage("Connection error");
    }
  }

  async function handleDisable() {
    setMessage("");
    try {
      const res = await fetch(`/api/portal/sessions/${params.id}/disable`, { method: "POST" });
      if (res.ok) {
        setMessageType("success");
        setMessage("Portal access disabled.");
        setTimeout(() => router.push("/dashboard/portal"), 1000);
      } else {
        const err = await res.json();
        setMessageType("error");
        setMessage(err.error || "Failed to disable");
      }
    } catch {
      setMessageType("error");
      setMessage("Connection error");
    }
  }

  async function handleCopyToken() {
    if (session?.portalToken) {
      await navigator.clipboard.writeText(session.portalToken);
      setMessageType("success");
      setMessage("Token copied to clipboard!");
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  if (!session) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Session not found</div>;

  const msgBg = messageType === "success" ? "var(--success)" : "var(--destructive)";
  const msgFg = messageType === "success" ? "var(--success-foreground)" : "var(--destructive-foreground)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/portal")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          Portal: {session.projectTitle || session.projectId}
        </h1>
        <Badge variant={session.lastAccessedAt ? "success" : "secondary"}>{session.lastAccessedAt ? "Active" : "Pending"}</Badge>
      </div>

      {message && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: msgBg, color: msgFg }}>{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card>
          <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Project ID</div>
              <div style={{ fontSize: 14 }}>{session.projectId}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Client Email</div>
              <div style={{ fontSize: 14 }}>{session.clientEmail || "Not set"}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Password Set</div>
              <div style={{ fontSize: 14 }}>{session.passwordHash ? "Yes" : "No"}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Last Accessed</div>
              <div style={{ fontSize: 14 }}>{session.lastAccessedAt ? new Date(session.lastAccessedAt).toLocaleString() : "Never"}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Created</div>
              <div style={{ fontSize: 14 }}>{session.createdAt ? new Date(session.createdAt).toLocaleString() : "Unknown"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Access Token</CardTitle></CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 12, backgroundColor: "var(--muted)", borderRadius: 6, wordBreak: "break-all", fontSize: 12, fontFamily: "monospace" }}>
              {session.portalToken}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="sm" variant="outline" onClick={handleCopyToken}>
                <Copy size={14} style={{ marginRight: 4 }} />Copy Token
              </Button>
              <Button size="sm" variant="outline" onClick={handleRegenerateToken}>
                <RefreshCw size={14} style={{ marginRight: 4 }} />Regenerate
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDisableOpen(true)}>
                <XCircle size={14} style={{ marginRight: 4 }} />Disable Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDisableOpen}
        onOpenChange={setConfirmDisableOpen}
        title="Disable portal access"
        message="Disable portal access for this project?"
        variant="neutral"
        confirmLabel="Disable access"
        onConfirm={() => void handleDisable()}
      />
    </div>
  );
}
