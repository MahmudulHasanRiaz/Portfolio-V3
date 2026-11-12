"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";
import { FileText } from "lucide-react";

interface Proposal {
  id: string; title: string | null; proposalType: string;
  status: string; sentAt: string | null; createdAt: string | null;
}

export default function PortalProposalsListPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((res) => setProposals(res.proposals || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Proposals</h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : proposals.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No proposals yet</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}`} style={{ textDecoration: "none" }}>
              <Card>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.title || "Proposal"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {p.proposalType} | {p.sentAt ? `Sent: ${new Date(p.sentAt).toLocaleDateString()}` : `Created: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}`}
                    </div>
                  </div>
                  <Badge variant={p.status === "accepted" ? "success" : p.status === "rejected" ? "destructive" : p.status === "sent" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
