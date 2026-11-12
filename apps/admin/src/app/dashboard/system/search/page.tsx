"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { listSynonyms, createSynonym, updateSynonym, deleteSynonym } from "@/actions/search";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";

interface Synonym { id: string; term: string; synonyms: string[]; isEnabled: boolean; }

export default function SearchManagementPage() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Synonym | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  async function load() {
    setLoading(true);
    const data = await listSynonyms();
    setSynonyms(data as unknown as Synonym[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const synonymsRaw = (form.get("synonyms") as string) || "";
    const data = {
      term: form.get("term") as string,
      synonyms: synonymsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setSaveError("");
    try {
      if (editing) await updateSynonym(editing.id, data);
      else await createSynonym(data);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save synonym.");
      return;
    }
    setShowDialog(false);
    setEditing(null);
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    await updateSynonym(id, { isEnabled: !current });
    load();
  }

  async function handleDelete(id: string) {
    await deleteSynonym(id);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Search Management</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Manage search synonyms and view search statistics
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 6 }} />Add Synonym</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Synonym" : "New Synonym"}</DialogTitle></DialogHeader>
            <form action={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input name="term" defaultValue={editing?.term || ""} placeholder="Term (e.g. musician)" required />
              <Input name="synonyms" defaultValue={editing?.synonyms?.join(", ") || ""} placeholder="Synonyms (comma separated)" />
              {saveError && <div style={{ color: "var(--danger, #c0392b)", fontSize: 13 }}>{saveError}</div>}
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {synonyms.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              No synonyms yet. Add one to improve search results.
            </div>
          )}
          {synonyms.map((syn) => (
            <Card key={syn.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Search size={14} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{syn.term}</span>
                    <Badge variant={syn.isEnabled ? "default" : "outline"}>
                      {syn.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  {syn.synonyms && syn.synonyms.length > 0 && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginLeft: 22 }}>
                      {syn.synonyms.join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(syn.id, syn.isEnabled)}>
                    {syn.isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(syn); setShowDialog(true); }}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(syn.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete synonym"
        message="Delete this synonym? Searches will no longer expand this term."
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
