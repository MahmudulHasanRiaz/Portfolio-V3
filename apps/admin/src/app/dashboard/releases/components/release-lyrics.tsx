"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Textarea, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Save } from "lucide-react";

interface Props {
  releaseId: string;
  onUpdate: () => void;
}

export function ReleaseLyrics({ releaseId, onUpdate }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    lyricsText: "",
    lyricsLanguage: "",
    translations: "{}",
    // Bangla lyrics — stored in Translations as the "bn" key (see submit).
    lyricsBn: "",
    status: "draft",
  });

  const fetchLyrics = () => {
    setLoading(true);
    fetch(`/api/releases/${releaseId}/lyrics`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          const translations =
            data.translations && typeof data.translations === "object"
              ? data.translations
              : {};
          setForm({
            lyricsText: data.lyricsText || "",
            lyricsLanguage: data.lyricsLanguage || "",
            translations: JSON.stringify(translations || {}, null, 2),
            lyricsBn:
              typeof translations.bn === "string" ? translations.bn : "",
            status: data.status || "draft",
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLyrics(); }, [releaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = { ...form };
      try {
        const translations = JSON.parse(body.translations as string) as Record<string, unknown>;
        // The Bangla field wins for the "bn" key; other translation keys
        // from the JSON box are preserved untouched. Clearing the Bangla
        // field removes the "bn" key (the public site then falls back).
        const lyricsBn = (body.lyricsBn as string).trim();
        if (lyricsBn) translations.bn = lyricsBn;
        else delete translations.bn;
        body.translations = translations;
      } catch { body.translations = null; }
      // lyricsBn is not a column — it lives inside translations.
      delete body.lyricsBn;

      const res = await fetch(`/api/releases/${releaseId}/lyrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save lyrics");
      }

      onUpdate();
      fetchLyrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <Card>
      <CardContent style={{ padding: 24 }}>
        {error && (
          <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Lyrics</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Language</label>
              <Input value={form.lyricsLanguage} onChange={(e) => setForm({ ...form, lyricsLanguage: e.target.value })} placeholder="e.g. en, ar, ur" />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Lyrics Text</label>
            <Textarea
              value={form.lyricsText}
              onChange={(e) => setForm({ ...form, lyricsText: e.target.value })}
              rows={10}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Lyrics (Bangla) — বাংলা</label>
            <Textarea
              value={form.lyricsBn}
              onChange={(e) => setForm({ ...form, lyricsBn: e.target.value })}
              rows={10}
              placeholder="বাংলা লিরিক্স (optional — saved into Translations as the “bn” key; empty shows the English lyrics)"
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Saved as the “bn” key in Translations below. If you edit the JSON directly, this field wins for “bn” on save.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Translations (JSON)</label>
            <Textarea
              value={form.translations}
              onChange={(e) => setForm({ ...form, translations: e.target.value })}
              rows={4}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" disabled={saving}>
              <Save size={16} style={{ marginRight: 6 }} />{saving ? "Saving..." : "Save Lyrics"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
