"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { createContent, deleteContent } from "@/actions/content";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * Page actions for the Pages list. The list previously had no way to create
 * a page (no button, no form) and no way to delete one — only edit.
 */
export function NewPageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = (await createContent("pages", {
        title,
        slug,
        status: "draft",
      })) as unknown as { id?: string };
      setOpen(false);
      if (result?.id) router.push(`/dashboard/content/pages/${result.id}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create page.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus size={16} style={{ marginRight: 6 }} />New Page</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Page</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ color: "var(--destructive)", fontSize: 14 }}>{error}</div>}
          <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Page title" required />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" required />
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePageButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    try {
      await deleteContent("pages", id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete page.");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} title={error || "Delete page"}>
        <Trash2 size={14} />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete page?"
        message={`Delete the page "${title}"?`}
        onConfirm={handleDelete}
      />
    </>
  );
}
