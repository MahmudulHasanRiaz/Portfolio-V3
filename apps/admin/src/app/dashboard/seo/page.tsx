import { Card, CardContent } from "@repo/ui";
import { BarChart3, Search, Eye, TrendingUp, FileText, List, CheckSquare } from "lucide-react";
import Link from "next/link";

export default function SEOPage() {
  const modules = [
    {
      label: "Metadata Editor",
      desc: "Manage SEO meta titles, descriptions, and OG images across all content",
      href: "/dashboard/seo/metadata",
      icon: FileText,
    },
    {
      label: "Redirect Manager",
      desc: "Create and manage URL redirects (301/302) for moved content",
      href: "/dashboard/seo/redirects",
      icon: Eye,
    },
    {
      label: "Sitemap Status",
      desc: "View sitemap and robots.txt generation status",
      href: "/dashboard/seo/sitemap",
      icon: List,
    },
    {
      label: "Validation Report",
      desc: "Run SEO validation checks and view results",
      href: "/dashboard/seo/validation",
      icon: CheckSquare,
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>SEO</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Search engine optimization settings and metadata management
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {modules.map((mod) => (
          <Link key={mod.label} href={mod.href} style={{ textDecoration: "none" }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "var(--accent-info)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <mod.icon size={20} />
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 16 }}>{mod.label}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{mod.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
