"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Badge } from "@repo/ui";
import { listTags, createTag, updateTag, deleteTag } from "@/actions/content";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Tag { id: string; name: string; slug: string | null; }

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  async function load() {
    setLoading(true);
    const data = await listTags();
    setTags(data as unknown as Tag[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const data = { name: form.get("name") as string, slug: form.get("slug") as string };
    try {
      if (editing) await updateTag(editing.id, data);
      else await createTag(data);
      setShowDialog(false);
      setEditing(null);
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save tag.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTag(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete tag.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Tags</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 6 }} />Add Tag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Tag" : "New Tag"}</DialogTitle></DialogHeader>
            <form action={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input name="name" defaultValue={editing?.name || ""} placeholder="Tag name" required />
              <Input name="slug" defaultValue={editing?.slug || ""} placeholder="slug" />
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.length === 0 && <div style={{ color: "var(--text-muted)", padding: 48 }}>No tags yet</div>}
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardContent style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                <Badge variant="outline">{tag.name}</Badge>
                <Button variant="outline" size="sm" onClick={() => { setEditing(tag); setShowDialog(true); }}><Edit size={12} /></Button>
                <Button variant="outline" size="sm" onClick={() => setPendingDelete(tag)}><Trash2 size={12} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete tag?"
        message={pendingDelete ? `Delete the tag "${pendingDelete.name}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete.id); }}
      />
    </div>
  );
}
