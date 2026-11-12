"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";

export interface EditorSection {
  id: string;
  sectionKey: string;
  content: Record<string, unknown> | null;
}

type Content = Record<string, unknown>;

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStatItems(v: unknown): { value: string; label: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i): i is Content => !!i && typeof i === "object")
    .map((i) => ({ value: asStr(i.value), label: asStr(i.label) }));
}

function asGroups(v: unknown): { group: string; items: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i): i is Content => !!i && typeof i === "object")
    .map((i) => ({ group: asStr(i.group), items: asStr(i.items) }));
}

function asLines(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.filter((i) => typeof i === "string").join("\n");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--border, #d1d5db)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
  marginBottom: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextField({ value, onChange, multiline }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  if (multiline) {
    return <textarea style={{ ...inputStyle, minHeight: 72 }} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function SectionEditor({
  section,
  onClose,
  onSaved,
}: {
  section: EditorSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = (section.content ?? {}) as Content;
  const [draft, setDraft] = useState<Content>(() => JSON.parse(JSON.stringify(initial)) as Content);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  async function handleSave(content: Content) {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/homepage/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Save failed");
      // Founder: one write path. The section row is the editor's stored
      // copy, but the public site reads the founder summary from the
      // `founder_summary` / `founder_summary_bn` settings keys — so
      // this save writes through to those keys as well. If the sync
      // fails the dialog stays open with an error (the section itself
      // is already saved); saving again retries the sync.
      if (section.sectionKey === "founder") {
        const sync = await fetch("/api/settings/site-copy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            founderSummary: asStr(content.summary),
            founderSummaryBn: asStr(content.summaryBn),
          }),
        });
        if (!sync.ok) {
          const err = await sync.json().catch(() => null);
          throw new Error(
            `Section saved, but the founder summary could not be synced to the public settings (${(err as { error?: string } | null)?.error ?? "sync failed"}) — please save again.`,
          );
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed — please try again.");
    }
    setSaving(false);
  }

  function handleJsonSave() {
    try {
      const parsed = JSON.parse(jsonText) as Content;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Content must be an object");
      setJsonError("");
      void handleSave(parsed);
    } catch {
      setJsonError("Invalid JSON — content must be a JSON object.");
    }
  }

  const key = section.sectionKey;
  const stats = asStatItems(draft.items);
  const groups = asGroups(draft.groups);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit section: {key}</DialogTitle>
        </DialogHeader>
        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          {key === "hero" && (
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 12px" }}>
                The hero headline, description and buttons are no longer
                edited here — these fields used to write to this section
                only, and nothing on the public site read them.
              </p>
              <p style={{ margin: 0 }}>
                Edit the hero copy at{" "}
                <Link href="/dashboard/settings/site-copy" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  Settings → Site Copy
                </Link>
                , and the homepage SEO title / description there too.
                Visibility and order for this section are set on the
                homepage list.
              </p>
            </div>
          )}
          {key === "stats" && (
            <>
              {stats.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} placeholder="Value (e.g. 80+)" value={item.value} onChange={(e) => {
                    const next = [...stats]; next[i] = { ...item, value: e.target.value }; set("items", next);
                  }} />
                  <input style={inputStyle} placeholder="Label (e.g. Projects Delivered)" value={item.label} onChange={(e) => {
                    const next = [...stats]; next[i] = { ...item, label: e.target.value }; set("items", next);
                  }} />
                  <Button variant="outline" size="sm" onClick={() => set("items", stats.filter((_, j) => j !== i))}>Remove</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("items", [...stats, { value: "", label: "" }])}>Add stat</Button>
            </>
          )}
          {key === "founder" && (
            <>
              <Field label="Summary"><TextField multiline value={asStr(draft.summary)} onChange={(v) => set("summary", v)} /></Field>
              <Field label="Summary (Bangla) — বাংলা"><TextField multiline value={asStr(draft.summaryBn)} onChange={(v) => set("summaryBn", v)} /></Field>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
                Saving here also updates the public settings keys the
                homepage reads (founder_summary / founder_summary_bn).
              </p>
            </>
          )}
          {key === "stack" && (
            <>
              <Field label="Tech items (one per line)">
                <TextField multiline value={asLines(draft.items)} onChange={(v) => set("items", v.split("\n").map((s) => s.trim()).filter(Boolean))} />
              </Field>
              {groups.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} placeholder="Group (e.g. Frontend)" value={g.group} onChange={(e) => {
                    const next = [...groups]; next[i] = { ...g, group: e.target.value }; set("groups", next);
                  }} />
                  <input style={inputStyle} placeholder="Items (comma separated)" value={g.items} onChange={(e) => {
                    const next = [...groups]; next[i] = { ...g, items: e.target.value }; set("groups", next);
                  }} />
                  <Button variant="outline" size="sm" onClick={() => set("groups", groups.filter((_, j) => j !== i))}>Remove</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("groups", [...groups, { group: "", items: "" }])}>Add group</Button>
            </>
          )}
          {key === "cta" && (
            <>
              <Field label="Heading"><TextField value={asStr(draft.heading)} onChange={(v) => set("heading", v)} /></Field>
              <Field label="Subheading"><TextField multiline value={asStr(draft.subheading)} onChange={(v) => set("subheading", v)} /></Field>
              <Field label="Button label"><TextField value={asStr(draft.ctaLabel)} onChange={(v) => set("ctaLabel", v)} /></Field>
              <Field label="Button link"><TextField value={asStr(draft.ctaUrl)} onChange={(v) => set("ctaUrl", v)} /></Field>
            </>
          )}
          {!["hero", "stats", "founder", "stack", "cta"].includes(key) && (
            <Field label="Content (JSON)">
              <textarea style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace", fontSize: 13 }} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
            </Field>
          )}
          {jsonError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{jsonError}</div>}
          {saveError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{saveError}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Button onClick={() => { if (["hero", "stats", "founder", "stack", "cta"].includes(key)) void handleSave(draft); else handleJsonSave(); }} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
