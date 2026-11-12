"use client";

import { Button, Input, Card, CardContent, Badge } from "@repo/ui";
import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Redirect {
  id: string;
  sourceSlug: string;
  destinationUrl: string;
  redirectType: number;
  isActive: boolean;
  entityType?: string | null;
}

export function RedirectManagerClient() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceSlug, setSourceSlug] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [redirectType, setRedirectType] = useState<number>(301);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchRedirects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/seo/redirects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRedirects(data.redirects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedirects();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceSlug.trim() || !destinationUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/seo/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceSlug: sourceSlug.trim(), destinationUrl: destinationUrl.trim(), redirectType, isActive }),
      });
      if (!res.ok) throw new Error("Failed to create redirect");
      setSourceSlug("");
      setDestinationUrl("");
      setRedirectType(301);
      setIsActive(true);
      await fetchRedirects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create redirect");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (redirect: Redirect) => {
    try {
      const res = await fetch(`/api/seo/redirects/${redirect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !redirect.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchRedirects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update redirect");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/seo/redirects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchRedirects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete redirect");
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Redirect Manager</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Create and manage URL redirects for moved or renamed content.
      </p>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--bg-danger, #fef2f2)", color: "var(--text-danger, #dc2626)", fontSize: 13, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline" }}>Dismiss</button>
        </div>
      )}

      <Card>
        <CardContent style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>Add Redirect</h3>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Source Slug</label>
                <Input
                  placeholder="old-page-slug"
                  value={sourceSlug}
                  onChange={(e) => setSourceSlug(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Destination URL</label>
                <Input
                  placeholder="/new-page-slug or https://..."
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Type</label>
                <select
                  value={redirectType}
                  onChange={(e) => setRedirectType(Number(e.target.value))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                >
                  <option value={301}>301 (Permanent)</option>
                  <option value={302}>302 (Temporary)</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20 }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="isActive" style={{ fontSize: 13, color: "var(--text-muted)" }}>Active</label>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Redirect"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
          Current Redirects ({redirects.length})
        </h3>
        {loading ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading...</p>
        ) : redirects.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>No redirects configured yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Source</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Destination</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontFamily: "monospace", fontSize: 13 }}>{r.sourceSlug}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontFamily: "monospace", fontSize: 13 }}>{r.destinationUrl}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <Badge variant={r.redirectType === 301 ? "default" : "secondary"}>{r.redirectType}</Badge>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleToggleActive(r)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                            backgroundColor: "transparent",
                            color: "var(--text-primary)",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(r.id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                            backgroundColor: "transparent",
                            color: "#dc2626",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete redirect"
        message="Delete this redirect? Old links using the source slug will stop redirecting."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
