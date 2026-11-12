"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";

interface Deliverable {
  id: string; title: string | null; projectId: string; status: string;
  submittedAt: string | null; projectTitle?: string;
}

export default function PortalDeliverablesListPage() {
  const [data, setData] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/deliverables?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res.deliverables || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Deliverables</h1>

      <div style={{ marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="revision_requested">Revision Requested</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No deliverables found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((d) => (
            <Link key={d.id} href={`/deliverables/${d.id}`} style={{ textDecoration: "none" }}>
              <Card>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {d.submittedAt ? `Submitted: ${new Date(d.submittedAt).toLocaleDateString()}` : "Not submitted"}
                    </div>
                  </div>
                  <Badge variant={d.status === "approved" ? "success" : d.status === "submitted" ? "default" : d.status === "revision_requested" ? "warning" : "secondary"}>
                    {d.status?.replace(/_/g, " ")}
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
