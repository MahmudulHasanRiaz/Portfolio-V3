"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import Link from "next/link";
import {
  DEFAULT_LANGUAGES,
  DEFAULT_LANGUAGE_DESCRIPTIONS,
  DEFAULT_LANGUAGE_LABELS,
  isDefaultLanguage,
  type DefaultLanguage,
} from "@/lib/default-language";

/**
 * General settings — the site-level basics: site name, tagline,
 * timezone and default language. Saved through one combined endpoint
 * (GET/PUT /api/settings/general) that writes the four existing
 * settings-table keys (site_name, site_tagline, timezone,
 * default_language); no new store, no migration.
 *
 * Deliberately NOT here: the focused profile / brand (Brand /
 * Identity) and the homepage copy (Site Copy) — those pages already
 * own their areas. The default-language picker also lives on Brand /
 * Identity today; General is its canonical home (language is a
 * site-level setting, not brand), and both pages write the same key.
 */

// Curated IANA timezones (Dhaka first). Twin of TIMEZONES in
// apps/api/src/lib/general-settings.ts — keep the two in sync; the API
// rejects any value outside its list.
const TIMEZONES = [
  "Asia/Dhaka",
  "UTC",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Jakarta",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
  color: "var(--text-primary)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-primary)",
  marginBottom: 6,
};

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-muted)",
  margin: "6px 0 0",
};

export default function GeneralSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [timezone, setTimezone] = useState<string>("Asia/Dhaka");
  const [defaultLanguage, setDefaultLanguage] =
    useState<DefaultLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/general")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.siteName === "string") setSiteName(data.siteName);
        if (typeof data.siteTagline === "string") {
          setSiteTagline(data.siteTagline);
        } else if (data.siteTagline === null) {
          setSiteTagline("");
        }
        if (
          typeof data.timezone === "string" &&
          (TIMEZONES as readonly string[]).includes(data.timezone)
        ) {
          setTimezone(data.timezone);
        }
        if (isDefaultLanguage(data.defaultLanguage)) {
          setDefaultLanguage(data.defaultLanguage);
        }
      })
      .catch(() => setMessage("Could not load current settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: siteName.trim(),
          siteTagline: siteTagline.trim() === "" ? null : siteTagline.trim(),
          timezone,
          defaultLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      // Re-read the saved (normalized) values straight from the
      // response, so what the form shows is what is stored.
      if (typeof data.siteName === "string") setSiteName(data.siteName);
      if (typeof data.siteTagline === "string") {
        setSiteTagline(data.siteTagline);
      } else if (data.siteTagline === null) {
        setSiteTagline("");
      }
      if (typeof data.timezone === "string") setTimezone(data.timezone);
      if (isDefaultLanguage(data.defaultLanguage)) {
        setDefaultLanguage(data.defaultLanguage);
      }
      setMessage("Saved. The public site uses the new name and tagline.");
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
        General
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        The site-level basics. Profile and brand settings live under{" "}
        <Link href="/dashboard/settings/brand-identity" style={{ color: "var(--brand)" }}>
          Brand / Identity
        </Link>
        ; homepage copy lives under{" "}
        <Link href="/dashboard/settings/site-copy" style={{ color: "var(--brand)" }}>
          Site Copy
        </Link>
        .
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label htmlFor="site-name" style={labelStyle}>
              Site name
            </label>
            <input
              id="site-name"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              maxLength={255}
              style={inputStyle}
            />
            <p style={hintStyle}>
              Shown in the browser tab (pages without their own title) and as
              the site name on shared links.
            </p>
          </div>

          <div>
            <label htmlFor="site-tagline" style={labelStyle}>
              Site description (tagline)
            </label>
            <input
              id="site-tagline"
              type="text"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              maxLength={500}
              placeholder="Software Engineer, Entrepreneur and Nasheed Artist — Dhaka, Bangladesh."
              style={inputStyle}
            />
            <p style={hintStyle}>
              The short description of the site, used as the default meta
              description on public pages without their own description.
              Leave empty to keep the built-in text. (The homepage SEO
              description is a separate field, edited under Site Copy.)
            </p>
          </div>

          <div>
            <label htmlFor="timezone" style={labelStyle}>
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={inputStyle}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p style={hintStyle}>
              Default timezone for the site (dates shown in the admin).
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Default locale
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
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0 26px" }}>
                    {DEFAULT_LANGUAGE_DESCRIPTIONS[lang]}
                  </p>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {message && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>{message}</p>
        )}
      </div>
    </div>
  );
}
