"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea } from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@repo/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface NoteData {
  id: string;
  note: string;
  isInternal: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface LeadNotesProps {
  leadId: string;
  notes: NoteData[];
  onUpdate: () => void;
}

export function LeadNotes({ leadId, notes, onUpdate }: LeadNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote, isInternal: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? `Failed to add note (${res.status})`);
        return;
      }
      setNewNote("");
      setAdding(false);
      onUpdate();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editText.trim()) return;
    setError("");
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editText }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? `Failed to update note (${res.status})`);
        return;
      }
      setEditingId(null);
      setEditText("");
      onUpdate();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setError("");
    const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      onUpdate();
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error ?? `Failed to delete note (${res.status})`);
  };

  return (
    <Card>
      <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Notes</CardTitle>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={14} style={{ marginRight: 4 }} />Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div style={{ color: "var(--danger, #c0392b)", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        {adding && (
          <div style={{ marginBottom: 16 }}>
            <Textarea
              placeholder="Enter note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewNote(""); setError(""); }}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={submitting || !newNote.trim()}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>No notes yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: n.isInternal ? "var(--bg-muted)" : "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                    {n.isInternal && (
                      <Badge variant="secondary" style={{ fontSize: 11, padding: "1px 6px" }}>Internal</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Edit note"
                      onClick={() => { setEditingId(n.id); setEditText(n.note); setError(""); }}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Delete note" onClick={() => setPendingDeleteId(n.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                {editingId === n.id ? (
                  <div>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditText(""); }}>Cancel</Button>
                      <Button size="sm" onClick={() => void handleSaveEdit(n.id)} disabled={savingEdit || !editText.trim()}>
                        {savingEdit ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{n.note}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete note"
        message="Delete this note? This cannot be undone."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </Card>
  );
}
