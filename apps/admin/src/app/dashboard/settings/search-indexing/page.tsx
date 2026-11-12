"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import Link from "next/link";

/**
 * Search Engine Indexing settings — the ONLY place public indexing is
 * switched on. Owner-only (dashboard, behind login). Default is OFF:
 * while off, the public site emits noindex, robots.txt disallows
 * everything, and the sitemap is empty. Turn it on only when the site
 * is final and all data is updated.
 */
export default function SearchIndexingSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/search-indexing")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.searchIndexingEnabled === "boolean") {
          setEnabled(data.searchIndexingEnabled);
        }
      })
      .catch(() => setMessage("Could not load current setting."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/search-indexing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchIndexingEnabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage(
        enabled
          ? "Saved. Search engines may now index the public site."
          : "Saved. Search engine indexing is off — the public site is hidden from search engines.",
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
        Search Engine Indexing
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        Control whether search engines may index the public site. It is off by
        default: while off, every public page emits noindex, robots.txt
        disallows everything, and the sitemap is empty. Turn it on only after
        you have finished updating all of the site&apos;s data and finalized it.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div
          style={{
            padding: 24,
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {enabled ? "Indexing is ON" : "Indexing is OFF"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {enabled
                ? "Search engines may crawl and index the public site."
                : "Search engines are blocked from the public site."}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Search engine indexing"
            onClick={() => setEnabled((v) => !v)}
            style={{
              width: 52,
              height: 30,
              borderRadius: 999,
              border: "none",
              backgroundColor: enabled ? "var(--brand)" : "var(--border)",
              position: "relative",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: enabled ? 25 : 3,
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: "#fff",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
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
