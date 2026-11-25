"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui";
import { useRouter, useParams } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExperienceForm } from "@/components/experience-form";
import {
  getExperienceEntryById,
  updateExperienceEntry,
  deleteExperienceEntry,
  type ExperienceEntryRow,
} from "@/actions/experience";

export default function EditExperienceEntryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<ExperienceEntryRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getExperienceEntryById(params.id)
      .then((data) => {
        setEntry(data);
        setFetching(false);
      })
      .catch(() => {
        setError("Experience entry not found");
        setFetching(false);
      });
  }, [params.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteExperienceEntry(params.id);
      router.push("/dashboard/experience");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Experience Entry</h1>
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {entry && (
        <>
          <ExperienceForm
            initial={entry}
            submitLabel="Save Changes"
            onSubmit={async (data) => {
              await updateExperienceEntry(params.id, data);
            }}
            onSaved={() => router.push("/dashboard/experience")}
          />
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)", maxWidth: 800 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting || loading}>Delete Entry</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete permanently removes this entry — it cannot be undone.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete experience entry"
            message={`Delete "${entry.title || "this entry"}"? This cannot be undone.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
        </>
      )}
    </div>
  );
}
