"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Badge, Input } from "@repo/ui";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PromptDialog } from "@/components/confirm-dialog";

interface Category {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
}

interface Props {
  ventureId: string;
}

/**
 * Assign venture categories, and manage the category list itself.
 * Previously this tab could only toggle assignments — the create / rename /
 * delete routes (`/api/ventures/categories`, `/api/ventures/categories/[id]`)
 * existed but no UI ever called them, and the empty state pointed at a
 * "Settings area" that has no venture-category management.
 */
export function VentureCategories({ ventureId }: Props) {
  const [assigned, setAssigned] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [renameCategory, setRenameCategory] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignedRes, allRes] = await Promise.all([
        fetch(`/api/ventures/${ventureId}/categories`),
        fetch("/api/ventures/categories"),
      ]);
      const assignedData = await assignedRes.json();
      const allData = await allRes.json();
      setAssigned(assignedData);
      setAllCategories(allData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [ventureId]);

  const assignedIds = new Set(assigned.map((c) => c.id));

  const handleToggle = async (categoryId: string) => {
    setSaving(true);
    const newIds = assignedIds.has(categoryId)
      ? assigned.filter((c) => c.id !== categoryId).map((c) => c.id)
      : [...assigned.map((c) => c.id), categoryId];

    await fetch(`/api/ventures/${ventureId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: newIds }),
    });

    await fetchData();
    setSaving(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ventures/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create category");
      }
      setNewName("");
      setNewDescription("");
      setShowCreateForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (name: string) => {
    if (!renameCategory) return;
    const res = await fetch(`/api/ventures/categories/${renameCategory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) fetchData();
    else setError("Could not rename category.");
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const res = await fetch(`/api/ventures/categories/${pendingDelete.id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchData();
    else setError("Could not delete category.");
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          Categories ({assigned.length})
        </h3>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus size={14} style={{ marginRight: 4 }} />{showCreateForm ? "Cancel" : "New Category"}
        </Button>
      </div>

      {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 12 }}>{error}</div>}

      {showCreateForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input placeholder="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <Input placeholder="Description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {assigned.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {assigned.map((cat) => (
            <Badge key={cat.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {cat.name || cat.slug}
              <button
                onClick={() => handleToggle(cat.id)}
                disabled={saving}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {allCategories.map((cat) => {
          const isAssigned = assignedIds.has(cat.id);
          return (
            <Card key={cat.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{cat.name || cat.slug}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <Button variant="ghost" size="sm" onClick={() => setRenameCategory(cat)} title="Rename category">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingDelete(cat)} title="Delete category">
                    <Trash2 size={14} />
                  </Button>
                  <Button
                    variant={isAssigned ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(cat.id)}
                    disabled={saving}
                  >
                    {isAssigned ? <Check size={14} /> : "+"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {allCategories.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
          No categories created yet. Use “New Category” above to create one.
        </div>
      )}

      <PromptDialog
        open={!!renameCategory}
        onOpenChange={(v) => { if (!v) setRenameCategory(null); }}
        title="Rename category"
        label="Category name"
        placeholder={renameCategory?.name || undefined}
        confirmLabel="Rename"
        onConfirm={handleRename}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title="Delete category?"
        message={pendingDelete ? `"${pendingDelete.name || pendingDelete.slug}" will be deleted and removed from every venture using it.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
