"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea } from "@repo/ui";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

const PIPELINE_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "archived", label: "Archived" },
];

interface LeadData {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  timeline: string | null;
  projectType: string | null;
  inquiryType: string | null;
  message: string | null;
  leadSource: string | null;
  status: string;
  assignedUserId: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface DashboardUser {
  id: string;
  name: string | null;
  email: string;
}

interface LeadProfileProps {
  lead: LeadData;
  onUpdate: () => void;
}

export function LeadProfile({ lead, onUpdate }: LeadProfileProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });
  const [statusLoading, setStatusLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [assignError, setAssignError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);

  // Keep the edit form in sync when the lead refetches (e.g. after a
  // status change), but never clobber an edit already in progress.
  useEffect(() => {
    if (!editing) setForm({ ...lead });
  }, [lead, editing]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const assignedUser = users.find((u) => u.id === lead.assignedUserId) ?? null;

  const handleSave = async () => {
    setSaveError("");
    // Status is changed only through the status control (dedicated route
    // + activity log); sending the stale form copy here could revert a
    // status change made after this form was opened. Same for conversion
    // ids, which no UI here edits.
    const { id, createdAt, updatedAt, assignedUserId, status, convertedToProjectId, convertedToEventId, ...updateData } = form as typeof form & {
      convertedToProjectId?: string | null;
      convertedToEventId?: string | null;
    };
    // An empty date input must go to the DB as NULL, not "" (invalid date).
    const payload = {
      ...updateData,
      followUpDate: updateData.followUpDate ? updateData.followUpDate : null,
    };
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setSaveError(json?.error ?? `Failed to save lead (${res.status})`);
        return;
      }
      setEditing(false);
      onUpdate();
    } catch {
      setSaveError("Could not reach the server. Check your connection and try again.");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusError("");
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatusError(json?.error ?? `Failed to change status (${res.status})`);
        return;
      }
      onUpdate();
    } catch {
      setStatusError("Could not reach the server. Check your connection and try again.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAssign = async (value: string) => {
    setAssignError("");
    const assignedUserId = value === "unassigned" ? null : value;
    try {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAssignError(json?.error ?? `Failed to assign lead (${res.status})`);
        return;
      }
      onUpdate();
    } catch {
      setAssignError("Could not reach the server. Check your connection and try again.");
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/crm");
      return;
    }
    const json = await res.json().catch(() => null);
    setSaveError(json?.error ?? `Failed to delete lead (${res.status})`);
  };

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{value}</div>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <CardTitle>Profile</CardTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={lead.status} onValueChange={handleStatusChange} disabled={statusLoading}>
            <SelectTrigger style={{ width: 140, height: 28 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editing ? (
            <div style={{ display: "flex", gap: 4 }}>
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm({ ...lead }); setSaveError(""); }}>Cancel</Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(true)} aria-label="Delete lead">
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(saveError || statusError || assignError) && (
          <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginBottom: 12 }}>
            {saveError || statusError || assignError}
          </div>
        )}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Full Name</div>
              <Input value={form.fullName || ""} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Email</div>
              <Input value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Phone</div>
              <Input value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Company</div>
              <Input value={form.company || ""} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Country</div>
              <Input value={form.country || ""} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Budget</div>
              <Input value={form.budget || ""} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Timeline</div>
              <Input value={form.timeline || ""} onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Follow-up Date</div>
              <Input
                type="date"
                value={form.followUpDate ? form.followUpDate.slice(0, 10) : ""}
                onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value || null }))}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Follow-up Notes</div>
              <Textarea value={form.followUpNotes || ""} onChange={(e) => setForm((f) => ({ ...f, followUpNotes: e.target.value }))} rows={2} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Message</div>
              <Textarea value={form.message || ""} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={3} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 4 }}>
              <div>
                {field("Email", lead.email)}
                {field("Phone", lead.phone)}
                {field("Company", lead.company)}
                {field("Country", lead.country)}
                {field("Lead Source", lead.leadSource?.replace(/_/g, " "))}
              </div>
              <div>
                {field("Budget", lead.budget)}
                {field("Timeline", lead.timeline)}
                {field("Project Type", lead.projectType?.replace(/_/g, " "))}
                {field("Inquiry Type", lead.inquiryType?.replace(/_/g, " "))}
                {field("Created", lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : null)}
                {field("Follow-up Date", lead.followUpDate ? new Date(lead.followUpDate + "T00:00:00").toLocaleDateString() : null)}
                {field("Follow-up Notes", lead.followUpNotes)}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Assigned To</div>
              <Select value={lead.assignedUserId ?? "unassigned"} onValueChange={handleAssign}>
                <SelectTrigger style={{ width: 220, height: 32 }}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                  {lead.assignedUserId && !assignedUser && (
                    <SelectItem value={lead.assignedUserId}>Unknown user</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {lead.message && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: "var(--bg-muted)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Message</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{lead.message}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(false); }}
        title="Delete lead"
        message={`Delete ${lead.fullName || "this lead"}? Notes and activities for this lead are deleted too. This cannot be undone.`}
        onConfirm={() => void handleDelete()}
      />
    </Card>
  );
}
