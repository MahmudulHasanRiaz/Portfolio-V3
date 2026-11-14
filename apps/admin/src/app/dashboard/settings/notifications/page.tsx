"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import Link from "next/link";

/**
 * Notification preferences — a master email switch plus one toggle per
 * event the system actually produces. Saved as one JSONB settings row
 * (key "notifications") via GET/PUT /api/settings/notifications.
 *
 * The two events are real triggers that already exist:
 *   New lead       — someone submits the contact form (POST
 *                     /api/public/leads, stored in the leads table).
 *   Abandoned lead — someone starts the contact form but leaves before
 *                     submitting (POST /api/abandoned, stored in
 *                     abandoned_leads).
 * No other event types: there is no other trigger in the codebase.
 *
 * HONEST SCOPE: there is NO email sender in the codebase today (no
 * SMTP / Resend / mailer anywhere) and no in-app notification feed,
 * so NO email is actually sent yet. These are preferences, saved now,
 * that a future sender will consult — the page says that plainly
 * instead of pretending the toggles deliver mail today.
 */

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        border: "none",
        backgroundColor: checked ? "var(--brand)" : "var(--border)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: "#fff",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function Row({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
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
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [newLead, setNewLead] = useState(true);
  const [abandonedLead, setAbandonedLead] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.emailEnabled === "boolean") {
          setEmailEnabled(data.emailEnabled);
        }
        if (typeof data.newLead === "boolean") setNewLead(data.newLead);
        if (typeof data.abandonedLead === "boolean") {
          setAbandonedLead(data.abandonedLead);
        }
      })
      .catch(() => setMessage("Could not load current settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled, newLead, abandonedLead }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (typeof data.emailEnabled === "boolean") {
        setEmailEnabled(data.emailEnabled);
      }
      if (typeof data.newLead === "boolean") setNewLead(data.newLead);
      if (typeof data.abandonedLead === "boolean") {
        setAbandonedLead(data.abandonedLead);
      }
      setMessage("Saved.");
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
        Notifications
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        Email notification preferences. Email delivery is not connected yet
        — no emails are sent today. These preferences are saved now and
        will apply once an email sender is configured.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Row
            title="Email notifications"
            description="Master switch — when off, no notification email is sent for any event."
            checked={emailEnabled}
            onChange={setEmailEnabled}
          />
          <Row
            title="New lead"
            description="Someone submits the contact form on the public site."
            checked={newLead}
            onChange={setNewLead}
            disabled={!emailEnabled}
          />
          <Row
            title="Abandoned lead"
            description="Someone starts the contact form but leaves before submitting."
            checked={abandonedLead}
            onChange={setAbandonedLead}
            disabled={!emailEnabled}
          />
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
