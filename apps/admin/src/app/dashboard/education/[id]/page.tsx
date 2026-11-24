"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";
import { useRouter, useParams } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EducationForm } from "@/components/education-form";
import {
  getEducationEntryById,
  updateEducationEntry,
  deleteEducationEntry,
  type EducationEntryRow,
} from "@/actions/education";

export default function EditEducationEntryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<EducationEntryRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getEducationEntryById(params.id)
      .then((data) => {
        setEntry(data);
        setFetching(false);
      })
      .catch(() => {
        setError("Education entry not found");
        setFetching(false);
      });
  }, [params.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEducationEntry(params.id);
      router.push("/dashboard/education");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Education Entry</h1>
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {entry && (
        <>
          <EducationForm
            initial={entry}
            submitLabel="Save Changes"
            onSubmit={async (data) => {
              await updateEducationEntry(params.id, data);
            }}
            onSaved={() => router.push("/dashboard/education")}
          />
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)", maxWidth: 800 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting || loading}>Delete Entry</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete permanently removes this entry — it cannot be undone.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete education entry"
            message={`Delete "${entry.degree || "this entry"}"? This cannot be undone.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
        </>
      )}
    </div>
  );
}
