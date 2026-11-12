"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Badge, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { ExternalLink, Calendar, Plus, Trash2, Edit2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * Media coverage (press mentions) for a venture. Previously this tab was
 * read-only: the list route only had GET, so mentions could never be added,
 * edited or deleted from the admin. The route now supports POST / PATCH /
 * DELETE and this tab uses all of them.
 *
 * NOTE: the media_mentions table has no author / mention-type / sentiment
 * columns — the old UI rendered those fields, so they were always blank.
 * Only real columns are shown: title, source name/URL, published date,
 * summary, status, featured.
 */
interface MediaMention {
  id: string;
  title: string | null;
  slug: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedDate: string | null;
  summary: string | null;
  isFeatured: boolean | null;
  status: string | null;
}

interface Props {
  ventureId: string;
}

const EMPTY_FORM = {
  title: "",
  sourceName: "",
  sourceUrl: "",
  publishedDate: "",
  summary: "",
  status: "draft",
  isFeatured: "no",
};

export function VentureMedia({ ventureId }: Props) {
  const [mentions, setMentions] = useState<MediaMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchMentions = () => {
    setLoading(true);
    fetch(`/api/ventures/${ventureId}/media`)
      .then((r) => r.json())
      .then((data) => setMentions(data.mentions || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMentions(); }, [ventureId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (mention: MediaMention) => {
    setForm({
      title: mention.title || "",
      sourceName: mention.sourceName || "",
      sourceUrl: mention.sourceUrl || "",
      publishedDate: mention.publishedDate || "",
      summary: mention.summary || "",
      status: mention.status || "draft",
      isFeatured: mention.isFeatured ? "yes" : "no",
    });
    setEditingId(mention.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form, isFeatured: form.isFeatured === "yes" };
      const res = await fetch(`/api/ventures/${ventureId}/media`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...body, mentionId: editingId } : body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save media mention");
      }
      resetForm();
      fetchMentions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/ventures/${ventureId}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentionId: id }),
    });
    if (res.ok) fetchMentions();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Media Coverage ({mentions.length})</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={14} style={{ marginRight: 4 }} />{showForm ? "Cancel" : "Add Coverage"}
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 8 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <Input placeholder="Source name (e.g. Prothom Alo)" value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
                <Input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
                <Input type="date" value={form.publishedDate} onChange={(e) => setForm({ ...form, publishedDate: e.target.value })} />
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.isFeatured} onValueChange={(v) => setForm({ ...form, isFeatured: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Not featured</SelectItem>
                    <SelectItem value="yes">Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mentions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No media coverage yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mentions.map((mention) => (
            <Card key={mention.id}>
              <CardContent style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {mention.title || "Untitled"}
                    </div>
                    {mention.summary && (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{mention.summary}</div>
                    )}
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {mention.sourceName && <span>{mention.sourceName}</span>}
                      {mention.publishedDate && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                          <Calendar size={12} />{mention.publishedDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {mention.status && <Badge variant="outline">{mention.status}</Badge>}
                    {mention.isFeatured && <Badge>Featured</Badge>}
                    {mention.sourceUrl && (
                      <a href={mention.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(mention)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(mention.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete media mention"
        message="Delete this media coverage entry?"
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
