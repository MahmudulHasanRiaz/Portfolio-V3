"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FolderKanban, FileCheck, FileText, MessageSquare, Receipt, LogOut, Search } from "lucide-react";
import { SearchDialog } from "../../components/search-dialog";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/deliverables", label: "Deliverables", icon: FileCheck },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/invoices", label: "Invoices", icon: Receipt },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 240, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-secondary)" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Client Portal</h2>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              borderRadius: 6, color: "var(--text-muted)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        </div>
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, fontSize: 14, fontWeight: 500,
                  backgroundColor: isActive ? "var(--bg-active)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  textDecoration: "none", transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-active)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, fontSize: 14, fontWeight: 500, color: "var(--text-muted)",
              background: "none", border: "none", cursor: "pointer", width: "100%",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-active)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 32, overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        {children}
      </main>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
