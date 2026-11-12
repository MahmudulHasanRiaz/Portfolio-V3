"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { listCategories, createCategory, updateCategory, deleteCategory } from "@/actions/content";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Category { id: string; name: string; slug: string | null; description: string | null; type: string | null; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  async function load() {
    setLoading(true);
    const data = await listCategories();
    setCategories(data as unknown as Category[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const data = { name: form.get("name") as string, slug: form.get("slug") as string, description: form.get("description") as string, type: form.get("type") as string };
    try {
      if (editing) await updateCategory(editing.id, data);
      else await createCategory(data);
      setShowDialog(false);
      setEditing(null);
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Categories</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 6 }} />Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
            <form action={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input name="name" defaultValue={editing?.name || ""} placeholder="Category name" required />
              <Input name="slug" defaultValue={editing?.slug || ""} placeholder="slug" />
              <Input name="description" defaultValue={editing?.description || ""} placeholder="Description" />
              <Input name="type" defaultValue={editing?.type || ""} placeholder="Type (post, project, etc.)" />
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.length === 0 && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 48 }}>No categories yet</div>}
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>/{cat.slug}{cat.type ? ` — ${cat.type}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(cat); setShowDialog(true); }}><Edit size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingDelete(cat)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete category?"
        message={pendingDelete ? `Delete the category "${pendingDelete.name}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete.id); }}
      />
    </div>
  );
}
