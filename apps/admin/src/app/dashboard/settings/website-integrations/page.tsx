"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Input } from "@repo/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Link from "next/link";

interface Integration {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TokenPanel {
  token: string;
  integrationName: string;
  regenerated: boolean;
}

/**
 * Website Integrations settings — the Bearer tokens the public website
 * uses to fetch live content through the single secure route. Create an
 * integration, copy its token once, and paste it as the website's token
 * (Cloudflare secret). A token is shown exactly once, inside the
 * highlighted panel below, and never again after it is dismissed.
 */
export default function WebsiteIntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [tokenPanel, setTokenPanel] = useState<TokenPanel | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<Integration | null>(
    null,
  );
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/integrations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load integrations.");
      setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load integrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const formatDate = (value: string | null) => {
    if (!value) return "Never";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleDateString();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setIntegrations((prev) => [data.integration, ...prev]);
      setNewName("");
      setCopied(false);
      setTokenPanel({
        token: data.token,
        integrationName: data.integration.name,
        regenerated: false,
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToken = async () => {
    if (!tokenPanel) return;
    try {
      await navigator.clipboard.writeText(tokenPanel.token);
      setCopied(true);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — select the
      // text so the user can copy it manually instead.
      tokenInputRef.current?.focus();
      tokenInputRef.current?.select();
      setCopied(false);
      setMessage("Copy did not work automatically — the token is selected, press Ctrl+C / Cmd+C to copy it.");
    }
  };

  const handleDismissToken = () => {
    // The token is cleared from state here and never rendered again.
    setTokenPanel(null);
    setCopied(false);
  };

  const handleToggleActive = async (integration: Integration) => {
    setBusyId(integration.id);
    setMessage("");
    try {
      const res = await fetch(`/api/settings/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !integration.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setIntegrations((prev) =>
        prev.map((item) => (item.id === integration.id ? data.integration : item)),
      );
      setMessage(
        data.integration.isActive
          ? `"${data.integration.name}" is active — the public website can use this token.`
          : `"${data.integration.name}" is deactivated — the public website can no longer use this token.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveRename = async (integration: Integration) => {
    const name = renameValue.trim();
    if (!name || name === integration.name) {
      setRenamingId(null);
      return;
    }
    setBusyId(integration.id);
    setMessage("");
    try {
      const res = await fetch(`/api/settings/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      setIntegrations((prev) =>
        prev.map((item) => (item.id === integration.id ? data.integration : item)),
      );
      setRenamingId(null);
      setMessage(`Renamed to "${data.integration.name}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    setMessage("");
    try {
      const res = await fetch(`/api/settings/integrations/${target.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setIntegrations((prev) => prev.filter((item) => item.id !== target.id));
      setMessage(`Deleted integration "${target.name}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateTarget) return;
    const target = regenerateTarget;
    setBusyId(target.id);
    setMessage("");
    try {
      const res = await fetch(`/api/settings/integrations/${target.id}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regenerate failed");
      setIntegrations((prev) =>
        prev.map((item) => (item.id === target.id ? data.integration : item)),
      );
      setCopied(false);
      setTokenPanel({
        token: data.token,
        integrationName: data.integration.name,
        regenerated: true,
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Regenerate failed.");
    } finally {
      setBusyId(null);
      setRegenerateTarget(null);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link href="/dashboard/settings" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        ← Back to Settings
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "12px 0 4px" }}>
        Website Integrations
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        The public website connects through these Bearer tokens, over one
        secure route. Create an integration, copy its token once, and paste
        it as the website&apos;s token (Cloudflare secret). The token is never
        shown again after this page — keep it safe.
      </p>

      {tokenPanel && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            border: "2px solid var(--brand)",
            backgroundColor: "var(--bg-secondary)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {tokenPanel.regenerated ? "New token — copy it now" : "Your token — copy it now"}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>
            {tokenPanel.regenerated
              ? `The old token for "${tokenPanel.integrationName}" has stopped working immediately. This is the new token.`
              : `This is the token for "${tokenPanel.integrationName}". Paste it as the website's token (Cloudflare secret).`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              ref={tokenInputRef}
              value={tokenPanel.token}
              readOnly
              onFocus={(e) => e.target.select()}
              style={{ fontFamily: "monospace", fontSize: 13, flex: 1 }}
              aria-label="Integration token (shown once)"
            />
            <Button type="button" variant="outline" onClick={() => void handleCopyToken()}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "12px 0 0" }}>
            Copy it now — this token will never be shown again.
          </p>
          <div style={{ marginTop: 12 }}>
            <Button type="button" onClick={handleDismissToken}>
              Done
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Integration name, e.g. Public website"
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          style={{ flex: 1 }}
          aria-label="New integration name"
        />
        <Button type="button" onClick={() => void handleCreate()} disabled={creating || !newName.trim()}>
          {creating ? "Creating…" : "Create integration"}
        </Button>
      </div>

      {message && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{message}</p>
      )}

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : integrations.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          No integrations yet — create one to connect the public website.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {integrations.map((integration) => {
            const isBusy = busyId === integration.id;
            const isRenaming = renamingId === integration.id;
            return (
              <div
                key={integration.id}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {isRenaming ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      maxLength={100}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveRename(integration);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      style={{ flex: 1, minWidth: 160 }}
                      aria-label="Integration name"
                    />
                  ) : (
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                      {integration.name}
                    </span>
                  )}
                  <Badge variant={integration.isActive ? "success" : "secondary"}>
                    {integration.isActive ? "Active" : "Revoked"}
                  </Badge>
                </div>

                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.6 }}>
                  <div>
                    Token: <code style={{ fontFamily: "monospace" }}>{integration.tokenPrefix}…</code>
                  </div>
                  <div>Last used: {formatDate(integration.lastUsedAt)}</div>
                  <div>Created: {formatDate(integration.createdAt)}</div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {isRenaming ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSaveRename(integration)}
                        disabled={isBusy || !renameValue.trim()}
                      >
                        {isBusy ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRenamingId(null)}
                        disabled={isBusy}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRegenerateTarget(integration)}
                        disabled={isBusy}
                      >
                        Regenerate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleToggleActive(integration)}
                        disabled={isBusy}
                      >
                        {isBusy
                          ? "Saving…"
                          : integration.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRenameValue(integration.name);
                          setRenamingId(integration.id);
                        }}
                        disabled={isBusy}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(integration)}
                        disabled={isBusy}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={regenerateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRegenerateTarget(null);
        }}
        variant="neutral"
        title="Regenerate token?"
        message={
          regenerateTarget
            ? `The old token for "${regenerateTarget.name}" will stop working immediately. The public website will need the new token pasted as its token (Cloudflare secret) to keep working.`
            : ""
        }
        confirmLabel="Regenerate"
        onConfirm={() => void handleRegenerate()}
        busy={busyId !== null}
        busyLabel="Regenerating…"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        variant="danger"
        title="Delete integration?"
        message={
          deleteTarget
            ? `This permanently deletes the "${deleteTarget.name}" integration. Its token will stop working immediately and the public website will no longer be able to fetch live content with it. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        busy={busyId !== null}
        busyLabel="Deleting…"
      />
    </div>
  );
}
