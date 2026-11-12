"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { getBreadcrumbs } from "@/lib/breadcrumbs";

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol style={{ display: "flex", alignItems: "center", gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.href} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
              {isLast ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    textDecoration: "none",
                  }}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
