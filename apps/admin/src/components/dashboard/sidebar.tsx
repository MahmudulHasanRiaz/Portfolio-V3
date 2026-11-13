"use client";

import { useEffect, useState } from "react";
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
    borderRadius: 10,
    backgroundColor: "var(--brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  // Favicon logo (same 34px brand mark as logoIcon, but an image).
  logoImg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    objectFit: "cover",
    flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
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
    textOverflow: "ellipsis",
    lineHeight: 1.2,
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 10,
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
    transition: "background-color 0.15s, color 0.15s",
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

export function DashboardSidebar({ userRoles, siteHost }: { userRoles: string[] | null; siteHost: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Brand mark: the favicon set in Settings → Brand Identity
  // (GET /api/settings/favicon, via the Hono proxy). When one is set it
  // is shown here instead of the "P" placeholder; when none is set (or
  // the fetch fails) the "P" mark stays. Fetched once when the sidebar
  // mounts — the dashboard layout persists across client navigations,
  // so this does not re-fetch on every tab switch.
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/favicon")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.faviconUrl === "string" && data.faviconUrl) {
          setFaviconUrl(data.faviconUrl);
        }
      })
      .catch(() => {
        // Keep the "P" placeholder when the favicon cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const navItems = filterNavigation(userRoles);

  // Accordion: groups toggle INDEPENDENTLY. Initially open every group
  // that contains the current route (top-level and any nested group),
  // so the active child is visible.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const open = new Set<string>();
    const walk = (items: NavItem[]) => {
      for (const item of items) {
        if (item.children && hasActiveDescendant(item, pathname)) {
          open.add(item.href);
          walk(item.children);
        }
      }
    };
    walk(navItems);
    return open;
  });

  // Accordion: groups toggle INDEPENDENTLY. An earlier version replaced
  // the whole expanded set with just the clicked href ("one group open
  // at a time"), which meant clicking a NESTED group (e.g. Proposals
  // under Portal & Proposals) closed its parent — the submenu could
  // never open, so Proposals looked disabled/dead. Independent toggles
  // keep a parent open while its nested group expands, and multiple
  // top-level groups may stay open (the modern sidebar behaviour).
  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        // Closing a group also closes any nested group inside it.
        next.delete(href);
        for (const h of [...next]) {
          if (h.startsWith(href + "/")) next.delete(h);
        }
      } else {
        next.add(href);
      }
      return next;
    });
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
          className="sidebar-nav-item"
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
        {faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faviconUrl} alt="" style={s.logoImg} />
        ) : (
          <div style={s.logoIcon}>P</div>
        )}
        {!collapsed && (
          <span style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <span style={s.logoText}>Portfolio OS</span>
            <span style={s.logoSub}>{siteHost ? `Admin · ${siteHost}` : "Admin"}</span>
          </span>
        )}
      </div>
      <nav style={s.nav}>
        {navItems.map((item) => renderNavItem(item))}
      </nav>
      {!collapsed && (
        <button
          onClick={() => setCollapsed(true)}
          className="sidebar-collapse-btn"
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
          className="sidebar-collapse-btn"
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
        /* Modern hover states: a soft wash on nav items and the
           collapse button (inline styles cannot express :hover). */
        .sidebar-nav-item:hover {
          background-color: var(--bg-active, rgba(255, 255, 255, 0.06));
          color: var(--text-primary);
        }
        .sidebar-collapse-btn:hover {
          background-color: var(--bg-active, rgba(255, 255, 255, 0.06));
          color: var(--text-primary);
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
