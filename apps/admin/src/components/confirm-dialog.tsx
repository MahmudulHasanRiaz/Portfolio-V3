"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from "@repo/ui";
import { AlertTriangle } from "lucide-react";

export type ConfirmDialogVariant = "danger" | "neutral";

export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog requests to close (Escape, backdrop, Cancel, X). */
  onOpenChange: (open: boolean) => void;
  /** Short heading, e.g. "Delete payment". */
  title: string;
  /** Full message — keep the exact text the old native confirm dialog showed. */
  message: string;
  /** Confirm button label. Defaults to "Delete" (danger) / "Confirm" (neutral). */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** "danger" renders a red confirm button; "neutral" renders the teal brand button. */
  variant?: ConfirmDialogVariant;
  /** Called when the user confirms. The dialog closes itself afterwards. */
  onConfirm: () => void | Promise<void>;
  /** While true the buttons are disabled and the confirm label shows a busy state. */
  busy?: boolean;
  busyLabel?: string;
}

/**
 * Shared in-app replacement for the native confirm dialog — the dashboard must never
 * use browser-native dialogs. Built on the @repo/ui Radix Dialog, so Escape,
 * backdrop-click close and focus trapping come free. Styled with the
 * dashboard design tokens (var() with fallbacks) so it matches the redesign
 * in both light and dark modes.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  busy = false,
  busyLabel,
}: ConfirmDialogProps) {
  const label = confirmLabel ?? (variant === "danger" ? "Delete" : "Confirm");
  const isDanger = variant === "danger";

  const handleConfirm = () => {
    void onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: 440,
          background: "var(--bg-card, var(--surface, #ffffff))",
          border: "1px solid var(--border, #dfe6e1)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow-lg, 0 24px 64px -16px rgba(16, 22, 19, 0.28))",
        }}
      >
        <DialogHeader>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "50%",
              marginBottom: 4,
              background: isDanger
                ? "var(--red-soft, #fbe9e7)"
                : "var(--accent-soft, #e2f2ee)",
              color: isDanger
                ? "var(--red, var(--destructive, #b3372f))"
                : "var(--brand, #0c7c6c)",
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <DialogTitle
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary, var(--foreground, #101613))",
            }}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--text-muted, var(--muted-foreground, #3d4742))",
            }}
          >
            {message}
          </DialogDescription>
        </DialogHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
            autoFocus
          >
            {busy && busyLabel ? busyLabel : label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog requests to close (Escape, backdrop, Cancel, X). */
  onOpenChange: (open: boolean) => void;
  /** Short heading, e.g. "New folder". */
  title: string;
  /** Helper text shown under the heading. */
  message?: string;
  /** Input label. */
  label?: string;
  /** Input placeholder. */
  placeholder?: string;
  /** Confirm button label. Defaults to "Create". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Called with the trimmed input value when the user confirms. */
  onConfirm: (value: string) => void | Promise<void>;
}

/**
 * Shared in-app replacement for the native prompt dialog — a small text-input dialog
 * on the same Radix base and tokens as ConfirmDialog. Empty/whitespace-only
 * input is rejected exactly like the old `if (!name) return;` guard.
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  message,
  label,
  placeholder,
  confirmLabel = "Create",
  cancelLabel = "Cancel",
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState("");

  const close = () => {
    setValue("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    void onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setValue("");
        onOpenChange(v);
      }}
    >
      <DialogContent
        style={{
          maxWidth: 440,
          background: "var(--bg-card, var(--surface, #ffffff))",
          border: "1px solid var(--border, #dfe6e1)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow-lg, 0 24px 64px -16px rgba(16, 22, 19, 0.28))",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary, var(--foreground, #101613))",
            }}
          >
            {title}
          </DialogTitle>
          {message && (
            <DialogDescription
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--text-muted, var(--muted-foreground, #3d4742))",
              }}
            >
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ marginTop: 4 }}>
            {label && (
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-muted, var(--muted-foreground, #3d4742))",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                {label}
              </label>
            )}
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              maxLength={100}
              style={{ height: 40 }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <Button type="button" variant="outline" onClick={close}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
