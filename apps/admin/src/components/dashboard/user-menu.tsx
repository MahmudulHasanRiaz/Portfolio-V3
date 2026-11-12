"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { authClient } from "@repo/auth";
import { useSession } from "@/components/providers/session-provider";
import Link from "next/link";

export function UserMenu() {
  const router = useRouter();
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  const user = session?.user;

  if (!user) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 6,
          color: "var(--text-primary)",
        }}
        aria-label="User menu"
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "var(--brand)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {(user.name || user.email).charAt(0).toUpperCase()}
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            display: "none",
          }}
          className="user-name-desktop"
        >
          {user.name || user.email}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: 200,
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {user.name || "User"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {user.email}
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              color: "var(--text-secondary)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            <Settings size={16} />
            Settings
          </Link>

          <button
            onClick={async () => {
              setOpen(false);
              await authClient.signOut();
              router.push("/auth/login");
              router.refresh();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              color: "var(--text-secondary)",
              fontSize: 14,
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
