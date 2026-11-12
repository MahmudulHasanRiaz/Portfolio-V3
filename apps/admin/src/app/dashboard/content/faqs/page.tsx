"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { listFAQs, createFAQ, updateFAQ, deleteFAQ } from "@/actions/content";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface FAQ { id: string; question: string | null; answer: string | null; sortOrder: number | null; entityType: string | null; entityId: string | null; }

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FAQ | null>(null);

  async function load() {
    setLoading(true);
    const data = await listFAQs();
    setFaqs(data as unknown as FAQ[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const data = {
      question: form.get("question") as string,
      answer: form.get("answer") as string,
      sortOrder: form.get("sortOrder") ? parseInt(form.get("sortOrder") as string) : undefined,
    };
    try {
      if (editing) await updateFAQ(editing.id, data);
      else await createFAQ(data);
      setShowDialog(false);
      setEditing(null);
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save FAQ.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFAQ(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete FAQ.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>FAQs</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 6 }} />Add FAQ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit FAQ" : "New FAQ"}</DialogTitle></DialogHeader>
            <form action={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input name="question" defaultValue={editing?.question || ""} placeholder="Question" required />
              <Textarea name="answer" defaultValue={editing?.answer || ""} placeholder="Answer" rows={4} />
              <Input name="sortOrder" defaultValue={editing?.sortOrder?.toString() || ""} placeholder="Sort order" type="number" />
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No FAQs yet</div>}
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{faq.question}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Order: {faq.sortOrder}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(faq); setShowDialog(true); }}><Edit size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingDelete(faq)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete FAQ?"
        message={pendingDelete ? `Delete the question "${pendingDelete.question}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete.id); }}
      />
    </div>
  );
}
