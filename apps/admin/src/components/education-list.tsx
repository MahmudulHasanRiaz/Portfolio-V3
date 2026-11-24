"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  listEducationEntries,
  deleteEducationEntry,
  type EducationEntryRow,
} from "@/actions/education";

// Education list (0039, PR #22): newest first by start date (the
// API's order). Each row shows the degree, institution, period and
// visibility, with Edit + Delete. Delete is a hard delete (there is
// no status/draft flow for education entries) behind a confirm
// dialog.

function periodLabel(entry: EducationEntryRow): string {
  const start = entry.startDate ? entry.startDate.slice(0, 4) : "";
  const end = entry.endDate ? entry.endDate.slice(0, 4) : "Present";
  if (!start && !end) return "";
  if (!start) return end;
  return `${start} – ${end}`;
}

export function EducationList() {
  const [entries, setEntries] = useState<EducationEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listEducationEntries()
      .then((rows) => {
        setEntries(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load education entries");
        setLoading(false);
      });
  }, []);

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteEducationEntry(confirmId);
      setEntries((rows) => rows.filter((r) => r.id !== confirmId));
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Education</h1>
        <Link href="/dashboard/education/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Entry</Button>
        </Link>
      </div>

      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          No education entries yet — add your first one with “New Entry” above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {entry.degree || "Untitled"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {[entry.institution, entry.fieldOfStudy, periodLabel(entry)]
                      .filter(Boolean)
                      .join(" · ") || "No details"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {entry.isVisible === false && <Badge variant="outline">Hidden</Badge>}
                  <Link href={`/dashboard/education/${entry.id}`}>
                    <Button variant="outline" size="sm"><Edit size={14} /></Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setConfirmId(entry.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
        {entries.length} total {entries.length === 1 ? "entry" : "entries"}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(open) => { if (!open) setConfirmId(null); }}
        title="Delete education entry"
        message={`Delete "${entries.find((r) => r.id === confirmId)?.degree || "this entry"}"? This cannot be undone.`}
        onConfirm={handleDelete}
        busy={deleting}
        busyLabel="Deleting…"
      />
    </div>
  );
}
