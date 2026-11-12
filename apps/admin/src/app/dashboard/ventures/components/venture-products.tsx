"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Input, Textarea, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Product {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  url: string | null;
  status: string;
  contentStatus: string;
  createdAt: string | null;
}

interface Props {
  ventureId: string;
}

export function VentureProducts({ ventureId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", url: "", status: "active", contentStatus: "draft" });

  const fetchProducts = () => {
    setLoading(true);
    fetch(`/api/ventures/${ventureId}/products`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [ventureId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !prev.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ventureId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }

      setForm({ name: "", slug: "", description: "", url: "", status: "active", contentStatus: "draft" });
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) fetchProducts();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Products ({products.length})</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} style={{ marginRight: 4 }} />Add Product</Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 8 }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input placeholder="Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
                <Input placeholder="Slug" value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} required />
                <Input placeholder="URL" value={form.url} onChange={(e) => handleChange("url", e.target.value)} />
                <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.contentStatus} onValueChange={(v) => handleChange("contentStatus", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={2} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No products yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{product.name || product.slug}</div>
                  {product.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{product.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge>{product.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(product.id)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete product"
        message="Delete this product?"
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
