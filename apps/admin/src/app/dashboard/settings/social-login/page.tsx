"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";
import Link from "next/link";

/**
 * Social Login settings — Google + GitHub sign-in for the admin.
 * Saved through GET/PUT /api/settings/social-login (one settings-table
 * row, key "social_login"). The API never returns a client secret:
 * GET reports `configured` + a masked client-ID prefix only, and PUT
 * treats an empty secret as "keep the stored one", so this form never
 * has to re-send a secret it cannot see.
 *
 * Social sign-in can never create an account (both providers run with
 * disableImplicitSignUp): only an email that already has an admin
 * account can sign in with Google/GitHub. The OAuth client secret
 * itself must be stored read-back — Better Auth sends it to the
 * provider on every code exchange, so hashing it is impossible.
 */

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

const cardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

type ProviderId = "google" | "github";

interface ProviderForm {
  enabled: boolean;
  clientId: string;
  /** Typed secret only — always "" when loaded (the API never returns it). */
  clientSecret: string;
  configured: boolean;
  clientIdPrefix: string | null;
}

const EMPTY_PROVIDER: ProviderForm = {
  enabled: false,
  clientId: "",
  clientSecret: "",
  configured: false,
  clientIdPrefix: null,
};

const PROVIDER_META: Record<
  ProviderId,
  { name: string; setupHint: string }
> = {
  google: {
    name: "Google",
    setupHint:
      "Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application). Paste the callback URL below as an Authorized redirect URI.",
  },
  github: {
    name: "GitHub",
    setupHint:
      "GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Paste the callback URL below as the Authorization callback URL.",
  },
};

function applyLoaded(
  data: unknown,
  setProvider: (id: ProviderId, form: ProviderForm) => void,
  setCallbackUrls: (urls: Record<ProviderId, string>) => void,
) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return;
  const record = data as Record<string, unknown>;
  for (const id of ["google", "github"] as const) {
    const raw = record[id];
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
    const p = raw as Record<string, unknown>;
    setProvider(id, {
      enabled: p.enabled === true,
      clientId: typeof p.clientId === "string" ? p.clientId : "",
      clientSecret: "",
      configured: p.configured === true,
      clientIdPrefix:
        typeof p.clientIdPrefix === "string" ? p.clientIdPrefix : null,
    });
  }
  const urls = record.callbackUrls;
  if (urls !== null && typeof urls === "object" && !Array.isArray(urls)) {
    const u = urls as Record<string, unknown>;
    setCallbackUrls({
      google: typeof u.google === "string" ? u.google : "",
      github: typeof u.github === "string" ? u.github : "",
    });
  }
}

export default function SocialLoginSettingsPage() {
  const [google, setGoogle] = useState<ProviderForm>({ ...EMPTY_PROVIDER });
  const [github, setGithub] = useState<ProviderForm>({ ...EMPTY_PROVIDER });
  const [callbackUrls, setCallbackUrls] = useState<Record<ProviderId, string>>(
    { google: "", github: "" },
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<ProviderId | null>(null);

  const setProvider = (id: ProviderId, form: ProviderForm) => {
    if (id === "google") setGoogle(form);
    else setGithub(form);
  };

  useEffect(() => {
    fetch("/api/settings/social-login")
      .then((r) => r.json())
      .then((data) => applyLoaded(data, setProvider, setCallbackUrls))
      .catch(() => setMessage("Could not load current settings."))
      .finally(() => setLoading(false));
    // setProvider is stable (setState wrappers) — run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/social-login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google: {
            enabled: google.enabled,
            clientId: google.clientId.trim(),
            clientSecret: google.clientSecret.trim(),
          },
          github: {
            enabled: github.enabled,
            clientId: github.clientId.trim(),
            clientSecret: github.clientSecret.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      // Re-read the saved (sanitized) values straight from the
      // response, so what the form shows is what is stored. The
      // secret inputs clear: an empty secret means "keep stored".
      applyLoaded(data, setProvider, setCallbackUrls);
      setMessage(
        "Saved. Sign-in with a newly enabled provider works within a minute — no redeploy needed.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (id: ProviderId) => {
    const url = callbackUrls[id];
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      setMessage("Could not copy — select the URL and copy it manually.");
    }
  };

  const renderProvider = (id: ProviderId, form: ProviderForm) => {
    const meta = PROVIDER_META[id];
    const update = (patch: Partial<ProviderForm>) =>
      setProvider(id, { ...form, ...patch });
    return (
      <div key={id} style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {meta.name}
          </h2>
          {form.configured && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Secret saved
              {form.clientIdPrefix ? ` · ${form.clientIdPrefix}` : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {meta.setupHint}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enable {meta.name} sign-in
          </label>
          <div>
            <label htmlFor={`${id}-client-id`} style={labelStyle}>
              Client ID
            </label>
            <input
              id={`${id}-client-id`}
              type="text"
              value={form.clientId}
              onChange={(e) => update({ clientId: e.target.value })}
              maxLength={255}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                id === "google"
                  ? "…apps.googleusercontent.com"
                  : "Ov23… (GitHub OAuth App client ID)"
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor={`${id}-client-secret`} style={labelStyle}>
              Client secret
            </label>
            <input
              id={`${id}-client-secret`}
              type="password"
              value={form.clientSecret}
              onChange={(e) => update({ clientSecret: e.target.value })}
              maxLength={500}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                form.configured
                  ? "•••••••• — saved, leave empty to keep it"
                  : "Paste the client secret"
              }
              style={inputStyle}
            />
            <p style={hintStyle}>
              Stored so the server can send it to {meta.name} on every
              sign-in (OAuth requires it) — it is never shown again after
              saving.
            </p>
          </div>
          <div>
            <label htmlFor={`${id}-callback-url`} style={labelStyle}>
              Callback URL — paste this into the {meta.name} OAuth app
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id={`${id}-callback-url`}
                type="text"
                value={callbackUrls[id]}
                readOnly
                spellCheck={false}
                style={{ ...inputStyle, flex: 1 }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopy(id)}
                disabled={!callbackUrls[id]}
              >
                {copied === id ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link
        href="/dashboard/settings"
        style={{ fontSize: 13, color: "var(--text-muted)" }}
      >
        ← Back to Settings
      </Link>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "12px 0 4px",
        }}
      >
        Social Login
      </h1>
      <p
        style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}
      >
        Let admins sign in with Google or GitHub instead of a password.
        Social sign-in only works for an email that already has an admin
        account — it can never create one, so a stranger&apos;s Google
        account cannot get in. The login page only shows a provider once
        it is enabled here with both credentials saved.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {renderProvider("google", google)}
          {renderProvider("github", github)}

          {message && (
            <p style={{ fontSize: 14, color: "var(--text-primary)" }}>
              {message}
            </p>
          )}
          <div>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save social login"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
