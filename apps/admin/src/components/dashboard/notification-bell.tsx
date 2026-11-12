"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

// There is no in-app notification feed yet: packages/notifications only
// sends email, and no notification API or store exists. The old bell was a
// dead button with a permanent red dot that implied unread notifications
// that do not exist. Now it opens an honest empty state instead, and the
// fake badge is gone. Building a real in-app feed needs a product
// decision (what generates a notification, and who receives it).
export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          padding: 8,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: 280,
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            padding: "16px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Notifications
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
            No notifications yet — there is no in-app notification feed, so nothing is waiting for you.
          </p>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-ink, var(--brand))", textDecoration: "none" }}
          >
            Notification preferences in Settings →
          </Link>
        </div>
      )}
    </div>
  );
}
