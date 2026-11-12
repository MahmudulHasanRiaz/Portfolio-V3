"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Textarea } from "@repo/ui";

const BIO_FIELDS = [
  {
    key: "aboutP1",
    label: "Bio — paragraph 1 (English)",
    placeholder: "Mahmudul Hasan Riaz is a software engineer from Dhaka, Bangladesh…",
  },
  {
    key: "aboutP1Bn",
    label: "Bio — paragraph 1 (Bangla) — বাংলা",
    placeholder: "মাহমুদুল হাসান রিয়াজ ঢাকার একজন সফটওয়্যার ইঞ্জিনিয়ার…",
  },
  {
    key: "aboutP2",
    label: "Bio — paragraph 2 (English)",
    placeholder: "He is also an entrepreneur and a public figure…",
  },
  {
    key: "aboutP2Bn",
    label: "Bio — paragraph 2 (Bangla) — বাংলা",
    placeholder: "তিনি একজন উদ্যোক্তা আর পাবলিক ফিগারও…",
  },
  {
    key: "aboutP3",
    label: "Bio — paragraph 3 (English)",
    placeholder: "As a nasheed artist and Hafiz-Alem…",
  },
  {
    key: "aboutP3Bn",
    label: "Bio — paragraph 3 (Bangla) — বাংলা",
    placeholder: "নাশিদ শিল্পী ও হাফিজ-আলেম হিসেবে…",
  },
] as const;

type BioKey = (typeof BIO_FIELDS)[number]["key"];

// Homepage hero + Know Me copy (EN + BN). These rows already existed in
// the settings table (seeded by migration 0018) and the PUT endpoint
// already accepted them — this page just never offered a form for them,
// so the only hero editing surface was the homepage section editor,
// whose hero fields write to homepage_sections.content that nothing on
// the public site reads. This is now the single hero editing surface.
const HERO_FIELDS = [
  {
    key: "heroHeadline",
    label: "Hero headline (English)",
    placeholder: "Headline shown on the public homepage",
  },
  {
    key: "heroHeadlineBn",
    label: "Hero headline (Bangla) — বাংলা",
    placeholder: "হোমপেজে দেখানো শিরোনাম",
  },
  {
    key: "heroDescription",
    label: "Hero description (English)",
    placeholder: "Short description under the homepage headline",
  },
  {
    key: "heroDescriptionBn",
    label: "Hero description (Bangla) — বাংলা",
    placeholder: "হোমপেজের শিরোনামের নিচে দেখানো বিবরণ",
  },
  {
    key: "knowMeHeadline",
    label: "Know Me headline (English)",
    placeholder: "Headline of the Know Me section on the homepage",
  },
  {
    key: "knowMeHeadlineBn",
    label: "Know Me headline (Bangla) — বাংলা",
    placeholder: "হোমপেজের Know Me সেকশনের শিরোনাম",
  },
  {
    key: "knowMeSub",
    label: "Know Me sub (English)",
    placeholder: "Sub-text under the Know Me headline",
  },
  {
    key: "knowMeSubBn",
    label: "Know Me sub (Bangla) — বাংলা",
    placeholder: "Know Me শিরোনামের নিচে দেখানো লেখা",
  },
] as const;

// Single homepage SEO title / description. This replaces the old
// per-variant hero SEO fields (Developer / Entrepreneur / Artist),
// which were write-only — the live <title> is one value, so it gets
// one field here, not three.
const SITE_FIELDS = [
  {
    key: "siteTitle",
    label: "Homepage SEO title",
    placeholder: "Title shown in the browser tab and search results",
  },
  {
    key: "siteDescription",
    label: "Homepage SEO description",
    placeholder: "Short description shown in search results",
  },
] as const;

type HeroKey = (typeof HERO_FIELDS)[number]["key"];
type SiteKey = (typeof SITE_FIELDS)[number]["key"];
type CopyKey = BioKey | HeroKey | SiteKey;

const ALL_KEYS: CopyKey[] = [
  ...BIO_FIELDS.map((f) => f.key),
  ...HERO_FIELDS.map((f) => f.key),
  ...SITE_FIELDS.map((f) => f.key),
];

function asLoadedString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function CopyField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 4}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function SiteCopySettingsPage() {
  const [copy, setCopy] = useState<Record<CopyKey, string>>({
    aboutP1: "",
    aboutP1Bn: "",
    aboutP2: "",
    aboutP2Bn: "",
    aboutP3: "",
    aboutP3Bn: "",
    heroHeadline: "",
    heroHeadlineBn: "",
    heroDescription: "",
    heroDescriptionBn: "",
    knowMeHeadline: "",
    knowMeHeadlineBn: "",
    knowMeSub: "",
    knowMeSubBn: "",
    siteTitle: "",
    siteDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/site-copy");
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || typeof data !== "object") {
          throw new Error(data?.error ?? "Failed to load site copy");
        }
        if (cancelled) return;
        const next: Record<CopyKey, string> = {
          aboutP1: "",
          aboutP1Bn: "",
          aboutP2: "",
          aboutP2Bn: "",
          aboutP3: "",
          aboutP3Bn: "",
          heroHeadline: "",
          heroHeadlineBn: "",
          heroDescription: "",
          heroDescriptionBn: "",
          knowMeHeadline: "",
          knowMeHeadlineBn: "",
          knowMeSub: "",
          knowMeSubBn: "",
          siteTitle: "",
          siteDescription: "",
        };
        for (const key of ALL_KEYS) next[key] = asLoadedString(data[key]);
        setCopy(next);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load site copy.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCopyField = (field: CopyKey, value: string) => {
    setCopy((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/site-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copy),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed");
      setMessage(
        "Saved. The public site now uses this copy (Bangla where filled in, English otherwise).",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link href="/dashboard/settings" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        ← Back to Settings
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px" }}>
        Site Copy
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        The copy the public site reads from the admin — the Know Me bio
        paragraphs, the homepage hero + Know Me headlines, and the single
        homepage SEO title / description — in both languages. Bangla
        fields are optional — when one is empty, visitors see the English
        text. When an English field is empty, the public site shows its
        built-in text.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "8px 0 0" }}>
            Homepage hero
          </h2>
          {HERO_FIELDS.map((f) => (
            <CopyField
              key={f.key}
              label={f.label}
              value={copy[f.key]}
              onChange={(v) => setCopyField(f.key, v)}
              rows={f.key.endsWith("Headline") ? 2 : 3}
              placeholder={f.placeholder}
            />
          ))}
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "8px 0 0" }}>
            Know Me bio
          </h2>
          {BIO_FIELDS.map((f) => (
            <CopyField
              key={f.key}
              label={f.label}
              value={copy[f.key]}
              onChange={(v) => setCopyField(f.key, v)}
              rows={4}
              placeholder={f.placeholder}
            />
          ))}
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "8px 0 0" }}>
            Homepage SEO
          </h2>
          {SITE_FIELDS.map((f) => (
            <CopyField
              key={f.key}
              label={f.label}
              value={copy[f.key]}
              onChange={(v) => setCopyField(f.key, v)}
              rows={f.key === "siteTitle" ? 2 : 3}
              placeholder={f.placeholder}
            />
          ))}
          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save site copy"}
            </Button>
          </div>
          {message && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{message}</p>}
        </div>
      )}
    </div>
  );
}
