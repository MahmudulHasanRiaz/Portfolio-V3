import { Metadata } from "next";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Settings
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Manage your dashboard preferences and system configuration
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 640,
        }}
      >
        {sections.map((section) => {
          const card = (
            <div
              key={section.title}
              style={{
                padding: 24,
                borderRadius: 8,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-secondary)",
                cursor: section.href ? "pointer" : "default",
                opacity: section.href ? 1 : 0.75,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {section.title}
                {!section.href && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    Not set up yet
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {section.description}
              </div>
            </div>
          );
          return section.href ? (
            <Link key={section.title} href={section.href} style={{ textDecoration: "none" }}>
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>
    </div>
  );
}

const sections: { title: string; description: string; href?: string }[] = [
  { title: "General", description: "Site name, description, timezone, locale — no settings page exists for this yet; it needs a product decision before it is built." },
  { title: "Notifications", description: "Configure notification channels and preferences — no settings page exists for this yet; it needs a product decision before it is built." },
  { title: "Payment Methods", description: "Manage payment methods for client billing", href: "/dashboard/settings/payment-methods" },
  { title: "Categories", description: "Manage project and event categories", href: "/dashboard/categories" },
  { title: "Brand / Identity", description: "Choose the focused public profile shown on the homepage (Developer, Entrepreneur, Artist)", href: "/dashboard/settings/brand-identity" },
  { title: "Site Copy", description: "Edit the Know Me bio paragraphs (English + Bangla) shown on the public site", href: "/dashboard/settings/site-copy" },
  { title: "Search Engine Indexing", description: "Turn search engine indexing on or off for the public site. Off by default — enable it only when the site is final.", href: "/dashboard/settings/search-indexing" },
  { title: "Website Integrations", description: "Manage the Bearer tokens the public website uses to fetch live content — create, regenerate, revoke, or delete integrations.", href: "/dashboard/settings/website-integrations" },
];
