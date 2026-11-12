"use client";

import { Search } from "lucide-react";
import { DashboardBreadcrumbs } from "./breadcrumbs";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { useCommandPalette } from "@/components/providers/command-palette-provider";

// Space spec ("Admin Dashboard" redesign): sticky 64px topbar, surface at
// 86% opacity + backdrop blur(12px) + bottom border; search pill 38px high
// (min(320px, 34vw)) with a ⌘K kbd chip; bell + theme toggle + avatar pill
// (UserMenu already renders the 32px teal initial circle + name; the pill
// wrapper below gives it the bordered avatar-pill frame). Tokens come from
// globals.css (other worker); every var() falls back to pre-existing vars.
const s: Record<string, React.CSSProperties> = {
  header: {
    height: 64,
    minHeight: 64,
    borderBottom: "1px solid var(--border)",
    backgroundColor:
      "color-mix(in srgb, var(--bg-primary, #ffffff) 86%, transparent)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 40,
  },
  searchTrigger: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 38,
    width: "min(320px, 34vw)",
    padding: "0 8px 0 12px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface-2, var(--bg-secondary))",
    color: "var(--text-muted)",
    fontSize: 13,
    cursor: "pointer",
    flexShrink: 0,
  },
  shortcut: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface, var(--bg-primary))",
    color: "var(--text-muted)",
  },
  spacer: { flex: 1 },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  avatarPill: {
    display: "flex",
    alignItems: "center",
    border: "1px solid var(--border)",
    borderRadius: 999,
    backgroundColor: "var(--surface, var(--bg-primary))",
    padding: 2,
  },
};

export function DashboardHeader() {
  const { setOpen } = useCommandPalette();

  return (
    <header style={s.header}>
      {/* Breadcrumbs (desktop) */}
      <div className="breadcrumb-desktop">
        <DashboardBreadcrumbs />
      </div>
      <div style={s.spacer} />

      {/* Search trigger */}
      <button
        style={s.searchTrigger}
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search size={16} style={{ flexShrink: 0 }} />
        <span className="search-label">Search...</span>
        <span style={s.shortcut} className="search-kbd">⌘K</span>
      </button>

      {/* Actions */}
      <div style={s.actions}>
        <NotificationBell />
        <ThemeToggle />
        <div style={s.avatarPill} className="avatar-pill">
          <UserMenu />
        </div>
      </div>

      <style jsx>{`
        .breadcrumb-desktop {
          display: block;
        }
        @media (max-width: 639px) {
          .breadcrumb-desktop {
            display: none;
          }
          /* Mobile: search collapses to a 38px icon button. */
          .search-trigger {
            width: 38px;
            min-width: 38px;
            padding: 0;
            justify-content: center;
          }
          .search-trigger .search-label,
          .search-trigger .search-kbd {
            display: none;
          }
          /* Mobile: avatar name hides (the circle stays). */
          .avatar-pill .user-name-desktop {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
