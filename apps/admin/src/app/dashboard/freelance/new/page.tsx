"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card, CardContent } from "@repo/ui";
import { ArrowLeft, Save } from "lucide-react";

interface LeadOption {
  id: string;
  fullName?: string | null;
  full_name?: string | null;
  email?: string | null;
}

export default function NewFreelanceProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<LeadOption[]>([]);

  // Client picker: without a linked lead the portal toggle can never bind
  // a client email, so the picker loads the lead list for the select.
  useEffect(() => {
    fetch("/api/leads?pageSize=100")
      .then(async (r) => {
        const json = await r.json();
        if (r.ok && Array.isArray(json.leads)) setLeads(json.leads);
      })
      .catch(() => { /* picker stays empty; client is optional */ });
  }, []);

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
      isPaidProject: form.get("isPaidProject") === "on",
      status: "draft",
    };

    try {
      const res = await fetch("/api/freelance/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      const project = await res.json();
      router.push(`/dashboard/freelance/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/freelance")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>New Freelance Project</h1>
      </div>

      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>{error}</div>}

      <Card>
        <CardContent style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Project Title *</label>
              <Input name="title" required placeholder="Enter project title" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</label>
              <Textarea name="description" rows={4} placeholder="Project description" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Client (lead)</label>
              <select name="clientId" defaultValue="" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
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
              <Textarea name="scopeNotes" rows={3} placeholder="Scope, deliverables, expectations" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Start Date</label>
                <Input type="date" name="startDate" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Expected End Date</label>
                <Input type="date" name="expectedEndDate" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Total Amount</label>
                <Input type="number" step="0.01" name="totalAgreedAmount" placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Currency</label>
                <select name="currency" defaultValue="USD" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="BDT">BDT</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="isPaidProject" id="isPaidProject" />
              <label htmlFor="isPaidProject" style={{ fontSize: 14 }}>This is a paid project</label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button type="submit" disabled={loading}><Save size={16} style={{ marginRight: 6 }} />{loading ? "Creating..." : "Create Project"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
