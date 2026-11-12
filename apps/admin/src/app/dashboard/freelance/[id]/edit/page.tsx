"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button, Input, Textarea, Card, CardContent } from "@repo/ui";
import { ArrowLeft, Save } from "lucide-react";

interface LeadOption {
  id: string;
  fullName?: string | null;
  full_name?: string | null;
  email?: string | null;
}

export default function EditFreelanceProjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  useEffect(() => {
    fetch(`/api/freelance/projects/${params.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Project not found");
        return json;
      })
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setFetching(false));
    fetch("/api/leads?pageSize=100")
      .then(async (r) => {
        const json = await r.json();
        if (r.ok && Array.isArray(json.leads)) setLeads(json.leads);
      })
      .catch(() => { /* picker stays empty; client is optional */ });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      title: form.get("title"),
      description: form.get("description"),
      scopeNotes: form.get("scopeNotes"),
      clientId: (form.get("clientId") as string) || null,
      startDate: form.get("startDate"),
      expectedEndDate: form.get("expectedEndDate"),
      totalAgreedAmount: form.get("totalAgreedAmount"),
      currency: form.get("currency") || "USD",
    };

    try {
      const res = await fetch(`/api/freelance/projects/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update");
      }
      router.push(`/dashboard/freelance/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally { setLoading(false); }
  }

  if (fetching) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/freelance/${params.id}`)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Project</h1>
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>{error}</div>}
      {project && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Project Title</label>
                <Input name="title" defaultValue={project.title as string || ""} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</label>
                <Textarea name="description" defaultValue={project.description as string || ""} rows={4} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Client (lead)</label>
                <select name="clientId" defaultValue={(project.clientId as string) || ""} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
                  <option value="">No client linked</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.fullName || lead.full_name || lead.email || "Unnamed lead"}{lead.email ? ` (${lead.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Scope Notes</label>
                <Textarea name="scopeNotes" defaultValue={project.scopeNotes as string || ""} rows={3} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Start Date</label>
                  <Input type="date" name="startDate" defaultValue={project.startDate as string || ""} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Expected End</label>
                  <Input type="date" name="expectedEndDate" defaultValue={project.expectedEndDate as string || ""} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Amount</label>
                  <Input type="number" step="0.01" name="totalAgreedAmount" defaultValue={project.totalAgreedAmount as string || ""} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Currency</label>
                  <select name="currency" defaultValue={(project.currency as string) || "USD"} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BDT">BDT</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button type="submit" disabled={loading}><Save size={16} style={{ marginRight: 6 }} />{loading ? "Saving..." : "Save"}</Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
