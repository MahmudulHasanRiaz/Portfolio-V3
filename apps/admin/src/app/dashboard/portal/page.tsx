"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Card, CardContent } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface PortalSession {
  id: string;
  projectId: string;
  portalToken: string;
  clientEmail: string | null;
  lastAccessedAt: string | null;
  createdAt: string | null;
  projectTitle?: string;
}

export default function PortalSessionsListPage() {
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/portal/sessions")
      .then((r) => r.json())
      .then((data) => {
        // The API returns a bare array. If it ever returns an error
        // object instead (auth/DB failure), do not crash on .map —
        // show the error. (An earlier version blindly setSessions on
        // whatever came back, so a 401 { error } crashed the page
        // with "e.map is not a function".)
        if (Array.isArray(data)) {
          setSessions(data);
        } else {
          setLoadError(
            typeof data?.error === "string" ? data.error : "Failed to load portal sessions.",
          );
        }
      })
      .catch(() => setLoadError("Failed to load portal sessions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Client Portal Sessions</h1>
      </div>

      {loadError && (
        <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--bg-danger, #fef2f2)", color: "var(--text-danger, #dc2626)", fontSize: 13, marginBottom: 16 }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No portal sessions yet. Enable portal access on a project to get started.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {s.projectTitle || s.projectId}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {s.clientEmail ? `${s.clientEmail} | ` : ""}
                    {s.lastAccessedAt ? `Last access: ${new Date(s.lastAccessedAt).toLocaleDateString()}` : "Never accessed"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge variant={s.lastAccessedAt ? "success" : "secondary"}>{s.lastAccessedAt ? "Active" : "Pending"}</Badge>
                  <Link href={`/dashboard/portal/${s.id}`}>
                    <Button variant="outline" size="sm"><ExternalLink size={14} /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
