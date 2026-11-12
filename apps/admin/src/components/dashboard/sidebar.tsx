"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, Menu, X } from "lucide-react";
import { cn } from "@repo/shared";
import { Button } from "@repo/ui";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui";
import { filterNavigation, type NavItem } from "@/lib/navigation";

// Space spec ("Admin Dashboard" redesign): sidebar 268px (76px collapsed),
// surface bg, 64px brand row, 34px teal "P" mark, nav items 13.8px/600 with
// 9px radius + 8x10px padding, active = accent-soft bg + accent-ink text.
// Tokens come from globals.css (other worker); every var() below falls back
// to the pre-existing dashboard vars so the shell still works if the new
// token layer has not landed yet.
const s: Record<string, React.CSSProperties> = {
  desktopSidebar: {
    width: 268,
    minWidth: 268,
    height: "100vh",
    borderRight: "1px solid var(--border)",
    backgroundColor: "var(--surface, var(--bg-secondary))",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "width 0.2s, min-width 0.2s",
  },
  desktopSidebarCollapsed: {
    width: 76,
    minWidth: 76,
  },
  logo: {
    height: 64,
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    borderBottom: "1px solid var(--border)",
    gap: 12,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "var(--brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: 11.5,
    fontWeight: 500,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    lineHeight: 1.2,
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: 13.8,
    fontWeight: 600,
    textDecoration: "none",
    transition: "background-color 0.15s, color 0.15s",
    border: "none",
    background: "none",
    width: "100%",
    textAlign: "left",
  },
  navItemActive: {
    color: "var(--accent-ink, var(--brand))",
    backgroundColor: "var(--accent-soft, var(--bg-active))",
  },
  navGroupLabel: {
    padding: "8px 16px 4px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
  },
  countBadge: {
    marginLeft: "auto",
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    borderRadius: 999,
    backgroundColor: "var(--bg-tertiary, var(--border))",
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  countBadgeActive: {
    backgroundColor: "var(--accent-soft, var(--bg-active))",
    color: "var(--accent-ink, var(--brand))",
  },
  collapseBtn: {
    height: 48,
    borderTop: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 16px",
    cursor: "pointer",
    color: "var(--text-muted)",
    background: "none",
    border: "none",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    fontSize: 13.8,
    fontWeight: 600,
    width: "100%",
  },
  mobileSidebarBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-primary)",
    padding: 8,
    alignSelf: "flex-start",
    marginTop: 12,
    flexShrink: 0,
  },
};

// NavItem carries no count today (navigation.ts has no badge data), so no
// badge renders — the optional field exists only so a future count shows as
// a grey pill (teal on the active item) without inventing numbers.
type NavItemWithCount = NavItem & { count?: number };

function itemCount(item: NavItem): number | undefined {
  return (item as NavItemWithCount).count;
}

function hasActiveDescendant(item: NavItem, pathname: string): boolean {
  if (!item.children) return false;
  return item.children.some(
    (child) =>
      pathname === child.href ||
      pathname.startsWith(child.href + "/") ||
      hasActiveDescendant(child, pathname),
  );
}

export function DashboardSidebar({ userRoles }: { userRoles: string[] | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = filterNavigation(userRoles);

  // Accordion: ONE group open at a time. Initially open the group that
  // contains the current route (if any), so the active child is visible.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = navItems.find(
      (item) => item.children && hasActiveDescendant(item, pathname),
    );
    return active ? new Set([active.href]) : new Set();
  });

  // Opening one group closes the others; tapping the open group closes it.
  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) =>
      prev.has(href) ? new Set() : new Set([href]),
    );
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.href);
    const expanded = expandedGroups.has(item.href);
    const descendantActive = hasChildren && hasActiveDescendant(item, pathname);
    const count = itemCount(item);

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? "#" : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleGroup(item.href);
            } else {
              setMobileOpen(false);
            }
          }}
          style={{
            ...s.navItem,
            ...(active && !hasChildren ? s.navItemActive : {}),
            paddingLeft: collapsed ? 10 : depth === 0 ? 10 : depth === 1 ? 36 : 52,
            justifyContent: collapsed ? "center" : "flex-start",
            ...(descendantActive && !collapsed
              ? { color: "var(--accent-ink, var(--brand))" }
              : {}),
          }}
        >
          <item.icon
            size={18}
            style={{
              flexShrink: 0,
              ...(active && !hasChildren
                ? { color: "var(--accent-ink, var(--brand))" }
                : {}),
            }}
          />
          {!collapsed && (
            <>
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.title}
              </span>
              {count !== undefined && (
                <span
                  style={{
                    ...s.countBadge,
                    ...(active && !hasChildren ? s.countBadgeActive : {}),
                  }}
                >
                  {count}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  size={16}
                  style={{
                    transition: "transform 0.2s",
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    flexShrink: 0,
                  }}
                />
              )}
            </>
          )}
        </Link>
        {!collapsed && hasChildren && expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={s.logo}>
        <div style={s.logoIcon}>P</div>
        {!collapsed && (
          <span style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <span style={s.logoText}>Portfolio OS</span>
            <span style={s.logoSub}>Admin · riaz.com.bd</span>
          </span>
        )}
      </div>
      <nav style={s.nav}>
        {navItems.map((item) => renderNavItem(item))}
      </nav>
      {!collapsed && (
        <button
          onClick={() => setCollapsed(true)}
          style={s.collapseBtn}
          title="Collapse sidebar"
        >
          <ChevronLeft size={18} />
          <span>Collapse</span>
        </button>
      )}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{ ...s.collapseBtn, justifyContent: "center", padding: 0 }}
          title="Expand sidebar"
        >
          <Menu size={18} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        style={s.mobileSidebarBtn}
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={24} />
      </button>

      {/* Mobile drawer */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          // The drawer shares its content with the desktop sidebar: never
          // open it collapsed (labels hidden) because of a desktop collapse.
          if (open) setCollapsed(false);
          setMobileOpen(open);
        }}
      >
        <SheetContent side="left" style={{ width: 268, padding: 0 }}>
          <SheetTitle style={{ display: "none" }}>Navigation</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        style={{
          ...s.desktopSidebar,
          ...(collapsed ? s.desktopSidebarCollapsed : {}),
        }}
        className="desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      <style jsx>{`
        .mobile-sidebar-toggle {
          display: none;
        }
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none;
          }
          .mobile-sidebar-toggle {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
