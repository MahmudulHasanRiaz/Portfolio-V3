"use client";

import { useEffect, useState } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import Link from "next/link";
import { MediaPicker } from "@/components/media-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  SITE_PRIMARY_IDENTITIES,
  SITE_PRIMARY_IDENTITY_LABELS,
  isSitePrimaryIdentity,
  type SitePrimaryIdentity,
} from "@repo/shared";
import {
  DEFAULT_LANGUAGES,
  DEFAULT_LANGUAGE_LABELS,
  DEFAULT_LANGUAGE_DESCRIPTIONS,
  isDefaultLanguage,
  type DefaultLanguage,
} from "@/lib/default-language";

/**
 * Brand / Identity settings — the ONLY place the focused public profile is
 * chosen. Owner-only (dashboard, behind login); visitors never see this
 * control and never pick an identity. Saving here updates the settings-table
 * row the public homepage reads on every request.
 */
const DESCRIPTIONS: Record<SitePrimaryIdentity, string> = {
  developer: "Homepage opens as a Software Engineer: hero, primary CTA, and first chapter are developer-focused.",
  "know-me": "Homepage opens as the Know Me profile: the full person — Software Engineer, Entrepreneur & Public Figure, and Islamic Artist — on one page.",
};

const copyFieldLabel = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
} as const;

function SiteCopyField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={copyFieldLabel}>{label}</label>
      {rows ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function BrandIdentitySettingsPage() {
  const [current, setCurrent] = useState<SitePrimaryIdentity | null>(null);
  const [selected, setSelected] = useState<SitePrimaryIdentity>("developer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [available, setAvailable] = useState(false);
  const [badgeText, setBadgeText] = useState("Available for projects");
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availMessage, setAvailMessage] = useState("");

  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [savingPortrait, setSavingPortrait] = useState(false);
  const [removingPortrait, setRemovingPortrait] = useState(false);
  const [portraitMessage, setPortraitMessage] = useState("");
  const [confirmRemovePortrait, setConfirmRemovePortrait] = useState(false);

  // Favicon — the browser-tab icon for the public site. Same
  // upload-then-save flow as the hero portrait (folder "brand").
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadedFaviconUrl, setUploadedFaviconUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [savingFavicon, setSavingFavicon] = useState(false);
  const [removingFavicon, setRemovingFavicon] = useState(false);
  const [faviconMessage, setFaviconMessage] = useState("");
  const [confirmRemoveFavicon, setConfirmRemoveFavicon] = useState(false);

  // Media Picker — picks an existing library image instead of uploading.
  // The pick lands in the same "uploaded, not saved yet" slot an upload
  // would, so the existing Save flow below is unchanged.
  const [pickerTarget, setPickerTarget] = useState<"portrait" | "favicon" | null>(null);

  const handlePickerSelect = (url: string) => {
    if (pickerTarget === "portrait") {
      setUploadedUrl(url);
      setPortraitMessage("Selected from the media library. Save below to use this portrait on the public site.");
    } else if (pickerTarget === "favicon") {
      setUploadedFaviconUrl(url);
      setFaviconMessage("Selected from the media library. Save below to use this favicon on the public site.");
    }
  };

  // Default language (en / bn / system) — like the theme switcher.
  const [defaultLanguage, setDefaultLanguage] = useState<DefaultLanguage>("en");
  const [currentLanguage, setCurrentLanguage] = useState<DefaultLanguage | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageMessage, setLanguageMessage] = useState("");

  // Bilingual site copy — hero + Know Me headlines/subs, English + Bangla.
  // Bangla fields are optional: empty means the public site shows English.
  const [siteCopy, setSiteCopy] = useState({
    heroHeadline: "",
    heroHeadlineBn: "",
    heroDescription: "",
    heroDescriptionBn: "",
    knowMeHeadline: "",
    knowMeHeadlineBn: "",
    knowMeSub: "",
    knowMeSubBn: "",
  });
  const [savingSiteCopy, setSavingSiteCopy] = useState(false);
  const [siteCopyMessage, setSiteCopyMessage] = useState("");

  const setCopyField = (field: keyof typeof siteCopy, value: string) => {
    setSiteCopy((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/primary-identity")
        .then((r) => r.json())
        .then((data) => {
          if (isSitePrimaryIdentity(data.primaryIdentity)) {
            setCurrent(data.primaryIdentity);
            setSelected(data.primaryIdentity);
          }
        }),
      fetch("/api/settings/availability")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.available === "boolean") setAvailable(data.available);
          if (data.badgeText) setBadgeText(data.badgeText);
        }),
      fetch("/api/settings/hero-portrait")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.portraitUrl === "string" && data.portraitUrl) {
            setPortraitUrl(data.portraitUrl);
          }
        }),
      fetch("/api/settings/favicon")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.faviconUrl === "string" && data.faviconUrl) {
            setFaviconUrl(data.faviconUrl);
          }
        }),
      fetch("/api/settings/default-language")
        .then((r) => r.json())
        .then((data) => {
          if (isDefaultLanguage(data.defaultLanguage)) {
            setCurrentLanguage(data.defaultLanguage);
            setDefaultLanguage(data.defaultLanguage);
          }
        }),
      fetch("/api/settings/site-copy")
        .then((r) => r.json())
        .then((data) => {
          setSiteCopy({
            heroHeadline: typeof data.heroHeadline === "string" ? data.heroHeadline : "",
            heroHeadlineBn: typeof data.heroHeadlineBn === "string" ? data.heroHeadlineBn : "",
            heroDescription: typeof data.heroDescription === "string" ? data.heroDescription : "",
            heroDescriptionBn: typeof data.heroDescriptionBn === "string" ? data.heroDescriptionBn : "",
            knowMeHeadline: typeof data.knowMeHeadline === "string" ? data.knowMeHeadline : "",
            knowMeHeadlineBn: typeof data.knowMeHeadlineBn === "string" ? data.knowMeHeadlineBn : "",
            knowMeSub: typeof data.knowMeSub === "string" ? data.knowMeSub : "",
            knowMeSubBn: typeof data.knowMeSubBn === "string" ? data.knowMeSubBn : "",
          });
        }),
    ])
      .catch(() => setMessage("Could not load current settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/primary-identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryIdentity: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setCurrent(selected);
      setMessage("Saved. The public homepage now opens with this focused profile.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    setAvailMessage("");
    try {
      const res = await fetch("/api/settings/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available, badgeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setAvailMessage("Availability settings saved.");
    } catch (error) {
      setAvailMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const handlePortraitUpload = async (file: File) => {
    setUploadingPortrait(true);
    setPortraitMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "profile");
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = data?.data?.url;
      if (typeof url !== "string" || !url) {
        throw new Error("Upload did not return a URL");
      }
      setUploadedUrl(url);
      setPortraitMessage("Uploaded. Save below to use this portrait on the public site.");
    } catch (error) {
      setPortraitMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingPortrait(false);
    }
  };

  const handleSavePortrait = async () => {
    if (!uploadedUrl) return;
    setSavingPortrait(true);
    setPortraitMessage("");
    try {
      const res = await fetch("/api/settings/hero-portrait", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portraitUrl: uploadedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setPortraitUrl(uploadedUrl);
      setUploadedUrl(null);
      setPortraitMessage("Saved. The public site now uses this hero portrait.");
    } catch (error) {
      setPortraitMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingPortrait(false);
    }
  };

  const handleRemovePortrait = async () => {
    setRemovingPortrait(true);
    setPortraitMessage("");
    try {
      const res = await fetch("/api/settings/hero-portrait", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portraitUrl: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remove failed");
      setPortraitUrl(null);
      setUploadedUrl(null);
      setPortraitMessage("Portrait removed. The public site falls back to its placeholder.");
    } catch (error) {
      setPortraitMessage(error instanceof Error ? error.message : "Remove failed.");
    } finally {
      setRemovingPortrait(false);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    setFaviconMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "brand");
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = data?.data?.url;
      if (typeof url !== "string" || !url) {
        throw new Error("Upload did not return a URL");
      }
      setUploadedFaviconUrl(url);
      setFaviconMessage("Uploaded. Save below to use this favicon on the public site.");
    } catch (error) {
      setFaviconMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSaveFavicon = async () => {
    if (!uploadedFaviconUrl) return;
    setSavingFavicon(true);
    setFaviconMessage("");
    try {
      const res = await fetch("/api/settings/favicon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: uploadedFaviconUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setFaviconUrl(uploadedFaviconUrl);
      setUploadedFaviconUrl(null);
      setFaviconMessage("Saved. The public site now uses this favicon in the browser tab.");
    } catch (error) {
      setFaviconMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingFavicon(false);
    }
  };

  const handleRemoveFavicon = async () => {
    setRemovingFavicon(true);
    setFaviconMessage("");
    try {
      const res = await fetch("/api/settings/favicon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remove failed");
      setFaviconUrl(null);
      setUploadedFaviconUrl(null);
      setFaviconMessage("Favicon removed. The public site falls back to its default icon.");
    } catch (error) {
      setFaviconMessage(error instanceof Error ? error.message : "Remove failed.");
    } finally {
      setRemovingFavicon(false);
    }
  };

  const handleSaveLanguage = async () => {
    setSavingLanguage(true);
    setLanguageMessage("");
    try {
      const res = await fetch("/api/settings/default-language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setCurrentLanguage(defaultLanguage);
      setLanguageMessage("Saved. The public site now opens in this language by default (a visitor's own switch still wins).");
    } catch (error) {
      setLanguageMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleSaveSiteCopy = async () => {
    setSavingSiteCopy(true);
    setSiteCopyMessage("");
    try {
      const res = await fetch("/api/settings/site-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteCopy),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSiteCopyMessage("Saved. The public site now uses this hero copy (Bangla where filled in, English otherwise).");
    } catch (error) {
      setSiteCopyMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingSiteCopy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link href="/dashboard/settings" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        ← Back to Settings
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px" }}>
        Brand / Identity
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        Choose which profile the public homepage opens with — Software
        Engineer, or Know Me (the full person on one page). The other
        content stays visible further down the page — this only changes
        which one opens it.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SITE_PRIMARY_IDENTITIES.map((id) => (
            <label
              key={id}
              style={{
                display: "block",
                padding: 16,
                borderRadius: 8,
                border: `1px solid ${selected === id ? "var(--brand)" : "var(--border)"}`,
                backgroundColor: "var(--bg-secondary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="radio"
                  name="primary-identity"
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                />
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {SITE_PRIMARY_IDENTITY_LABELS[id]}
                  {current === id && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                      (current)
                    </span>
                  )}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0 26px" }}>
                {DESCRIPTIONS[id]}
              </p>
            </label>
          ))}
          <div>
            <Button onClick={handleSave} disabled={saving || selected === current}>
              {saving ? "Saving…" : "Save focused profile"}
            </Button>
          </div>
          {message && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{message}</p>}

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Hero portrait
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              The photo shown in the hero on the public site. Upload it here —
              it is stored in the dashboard media storage, never in a repo.
              Recommended: 1080×1350 (4:5), WebP/AVIF preferred (JPEG/PNG ok), max 10 MB, quality 75–80 —
              don&apos;t compress aggressively. No manual resizing needed — the public site automatically
              optimizes it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {portraitUrl && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    Current portrait
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={portraitUrl}
                    alt="Current hero portrait"
                    style={{ display: "block", maxWidth: 200, border: "1px solid var(--border)" }}
                  />
                </div>
              )}
              {uploadedUrl && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    New portrait — not saved yet
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedUrl}
                    alt="Newly uploaded hero portrait"
                    style={{ display: "block", maxWidth: 200, border: "1px solid var(--border)" }}
                  />
                </div>
              )}
              {!portraitUrl && !uploadedUrl && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  No portrait set — the public site shows its placeholder.
                </p>
              )}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>
                  Upload a new portrait
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPortrait}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePortraitUpload(file);
                    e.target.value = "";
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <Button type="button" variant="outline" onClick={() => setPickerTarget("portrait")}>
                  Choose from library
                </Button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSavePortrait} disabled={savingPortrait || !uploadedUrl}>
                  {savingPortrait ? "Saving…" : "Save portrait"}
                </Button>
                <Button onClick={() => setConfirmRemovePortrait(true)} disabled={removingPortrait || !portraitUrl}>
                  {removingPortrait ? "Removing…" : "Remove portrait"}
                </Button>
              </div>
              {uploadingPortrait && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Uploading…</p>}
              {portraitMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{portraitMessage}</p>}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Favicon
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              The small icon shown in the browser tab for the public site.
              Upload a square image (PNG or SVG works best) — it is stored
              in the dashboard media storage, never in a repo.
              Recommended: 512×512 square PNG or SVG. No manual resizing needed — the public site
              automatically optimizes it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {faviconUrl && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    Current favicon
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={faviconUrl}
                    alt="Current favicon"
                    style={{ display: "block", width: 48, height: 48, border: "1px solid var(--border)" }}
                  />
                </div>
              )}
              {uploadedFaviconUrl && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    New favicon — not saved yet
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedFaviconUrl}
                    alt="Newly uploaded favicon"
                    style={{ display: "block", width: 48, height: 48, border: "1px solid var(--border)" }}
                  />
                </div>
              )}
              {!faviconUrl && !uploadedFaviconUrl && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  No favicon set — the public site shows its default icon.
                </p>
              )}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>
                  Upload a new favicon
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingFavicon}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFaviconUpload(file);
                    e.target.value = "";
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <Button type="button" variant="outline" onClick={() => setPickerTarget("favicon")}>
                  Choose from library
                </Button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSaveFavicon} disabled={savingFavicon || !uploadedFaviconUrl}>
                  {savingFavicon ? "Saving…" : "Save favicon"}
                </Button>
                <Button onClick={() => setConfirmRemoveFavicon(true)} disabled={removingFavicon || !faviconUrl}>
                  {removingFavicon ? "Removing…" : "Remove favicon"}
                </Button>
              </div>
              {uploadingFavicon && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Uploading…</p>}
              {faviconMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{faviconMessage}</p>}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Default language
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Which language the public site opens in — like the theme
              (light / dark / system). A visitor&apos;s own language switch
              always wins and is remembered; this only sets the default.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {DEFAULT_LANGUAGES.map((lang) => (
                <label
                  key={lang}
                  style={{
                    display: "block",
                    padding: 16,
                    borderRadius: 8,
                    border: `1px solid ${defaultLanguage === lang ? "var(--brand)" : "var(--border)"}`,
                    backgroundColor: "var(--bg-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="default-language"
                      checked={defaultLanguage === lang}
                      onChange={() => setDefaultLanguage(lang)}
                    />
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                      {DEFAULT_LANGUAGE_LABELS[lang]}
                      {currentLanguage === lang && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                          (current)
                        </span>
                      )}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0 26px" }}>
                    {DEFAULT_LANGUAGE_DESCRIPTIONS[lang]}
                  </p>
                </label>
              ))}
              <div>
                <Button onClick={handleSaveLanguage} disabled={savingLanguage || defaultLanguage === currentLanguage}>
                  {savingLanguage ? "Saving…" : "Save default language"}
                </Button>
              </div>
              {languageMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{languageMessage}</p>}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Hero copy — English + Bangla
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              The headlines on the public homepage, in both languages. Bangla
              fields are optional — when one is empty, visitors see the
              English copy. (Stats labels in Bangla are edited in the
              homepage “stats” section as label_bn per item.)
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SiteCopyField
                label="Hero headline (English)"
                value={siteCopy.heroHeadline}
                onChange={(v) => setCopyField("heroHeadline", v)}
                placeholder="I build products people rely on every day."
              />
              <SiteCopyField
                label="Hero headline (Bangla) — বাংলা"
                value={siteCopy.heroHeadlineBn}
                onChange={(v) => setCopyField("heroHeadlineBn", v)}
                placeholder="বাংলা হিরো শিরোনাম (optional — empty shows English)"
              />
              <SiteCopyField
                label="Hero description (English)"
                value={siteCopy.heroDescription}
                onChange={(v) => setCopyField("heroDescription", v)}
                rows={3}
                placeholder="ERP, e-commerce and SaaS systems for businesses in Bangladesh and beyond…"
              />
              <SiteCopyField
                label="Hero description (Bangla) — বাংলা"
                value={siteCopy.heroDescriptionBn}
                onChange={(v) => setCopyField("heroDescriptionBn", v)}
                rows={3}
                placeholder="বাংলা হিরো বিবরণ (optional — empty shows English)"
              />
              <SiteCopyField
                label="Know Me headline (English)"
                value={siteCopy.knowMeHeadline}
                onChange={(v) => setCopyField("knowMeHeadline", v)}
                placeholder="Software engineer, entrepreneur and nasheed artist — one person, five callings."
              />
              <SiteCopyField
                label="Know Me headline (Bangla) — বাংলা"
                value={siteCopy.knowMeHeadlineBn}
                onChange={(v) => setCopyField("knowMeHeadlineBn", v)}
                placeholder="বাংলা Know Me শিরোনাম (optional — empty shows English)"
              />
              <SiteCopyField
                label="Know Me sub (English)"
                value={siteCopy.knowMeSub}
                onChange={(v) => setCopyField("knowMeSub", v)}
                rows={3}
                placeholder="Mahmudul Hasan Riaz — a Hafiz-Alem who builds ERP and e-commerce software…"
              />
              <SiteCopyField
                label="Know Me sub (Bangla) — বাংলা"
                value={siteCopy.knowMeSubBn}
                onChange={(v) => setCopyField("knowMeSubBn", v)}
                rows={3}
                placeholder="বাংলা Know Me উপ-শিরোনাম (optional — empty shows English)"
              />
              <div>
                <Button onClick={handleSaveSiteCopy} disabled={savingSiteCopy}>
                  {savingSiteCopy ? "Saving…" : "Save hero copy"}
                </Button>
              </div>
              {siteCopyMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{siteCopyMessage}</p>}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Public Availability Status
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Controls the availability badge displayed on your public site. Turn off anytime to hide the badge completely.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Currently available for new projects & consultations
                </span>
              </label>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>
                  Badge text (when active)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. Available for projects"
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <Button onClick={handleSaveAvailability} disabled={savingAvailability}>
                  {savingAvailability ? "Saving…" : "Save availability"}
                </Button>
              </div>
              {availMessage && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{availMessage}</p>}
            </div>
          </div>
        </div>
      )}
      <MediaPicker
        open={pickerTarget !== null}
        onOpenChange={(open) => { if (!open) setPickerTarget(null); }}
        onSelect={handlePickerSelect}
        type="image"
        title={pickerTarget === "favicon" ? "Choose favicon" : "Choose hero portrait"}
        uploadFolder={pickerTarget === "favicon" ? "brand" : "profile"}
      />
      <ConfirmDialog
        open={confirmRemovePortrait}
        onOpenChange={setConfirmRemovePortrait}
        title="Remove hero portrait"
        message="Remove the hero portrait? The public site falls back to its placeholder."
        confirmLabel="Remove portrait"
        onConfirm={() => void handleRemovePortrait()}
        busy={removingPortrait}
        busyLabel="Removing…"
      />
      <ConfirmDialog
        open={confirmRemoveFavicon}
        onOpenChange={setConfirmRemoveFavicon}
        title="Remove favicon"
        message="Remove the favicon? The public site falls back to its default icon."
        confirmLabel="Remove favicon"
        onConfirm={() => void handleRemoveFavicon()}
        busy={removingFavicon}
        busyLabel="Removing…"
      />
    </div>
  );
}
