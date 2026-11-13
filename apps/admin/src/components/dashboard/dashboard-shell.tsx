"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "./sidebar";
import { DashboardHeader } from "./header";
import { CommandPalette } from "./command-palette";
import { useSession } from "@/components/providers/session-provider";

export function DashboardShell({ children, siteHost }: { children: React.ReactNode; siteHost: string }) {
  const { session, isLoading } = useSession();
  // null = roles not known yet (still loading, or the request failed).
  // filterNavigation(null) shows all items: navigation is not a security
  // boundary, and an empty/failing roles fetch used to blank the sidebar.
  const [userRoles, setUserRoles] = useState<string[] | null>(null);

  useEffect(() => {
    async function fetchRoles() {
      if (!session?.user?.email) return;
      try {
        const res = await fetch("/api/auth/user/roles");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles)) setUserRoles(data.roles);
        }
        // Non-OK / malformed: leave null so the full nav stays visible.
      } catch {
        // Fall back to full navigation (see above).
      }
    }
    fetchRoles();
  }, [session]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <DashboardSidebar userRoles={userRoles} siteHost={siteHost} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <DashboardHeader />
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "28px 24px 56px",
            backgroundColor: "var(--bg, var(--bg-primary))",
          }}
        >
          <div
            style={{
              maxWidth: 1560,
              margin: "0 auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
