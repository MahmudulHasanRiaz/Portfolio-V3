import { listContent, listFAQs, listTimelineEvents } from "@/actions/content";
import { Card, CardContent, Button } from "@repo/ui";
import Link from "next/link";
import { FileText, Newspaper, ConciergeBell, FolderKanban, HelpCircle, Clock } from "lucide-react";

export default async function ContentOverviewPage() {
  const [posts, services, projects, pages, caseStudies, faqs, timeline] = await Promise.all([
    listContent("posts", { pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
    listContent("services", { pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
    listContent("projects", { pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
    listContent("pages", { pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
    listContent("case_studies", { pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
    listFAQs().catch(() => []),
    listTimelineEvents({ pageSize: 1 }).catch(() => ({ pagination: { total: 0 } })),
  ]);

  const types = [
    { label: "Pages", count: (pages as any).pagination?.total ?? "—", href: "/dashboard/content/pages", icon: FileText, color: "var(--accent-info)" },
    { label: "Blog Posts", count: (posts as any).pagination?.total ?? "—", href: "/dashboard/blog", icon: Newspaper, color: "var(--accent-success)" },
    { label: "Services", count: (services as any).pagination?.total ?? "—", href: "/dashboard/services", icon: ConciergeBell, color: "var(--accent-warning)" },
    { label: "Projects", count: (projects as any).pagination?.total ?? "—", href: "/dashboard/projects", icon: FolderKanban, color: "var(--accent-danger)" },
    { label: "Case Studies", count: (caseStudies as any).pagination?.total ?? "—", href: "/dashboard/content/case-studies", icon: FileText, color: "var(--accent-info)" },
    { label: "FAQs", count: (faqs as any[]).length ?? 0, href: "/dashboard/content/faqs", icon: HelpCircle, color: "var(--accent-warning)" },
    { label: "Timeline", count: (timeline as any).pagination?.total ?? "—", href: "/dashboard/content/timeline", icon: Clock, color: "var(--text-muted)" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Content Overview</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {types.map((item) => (
          <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: item.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{item.count}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Quick Actions</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/dashboard/blog/new"><Button>New Blog Post</Button></Link>
        <Link href="/dashboard/services/new"><Button variant="outline">New Service</Button></Link>
        <Link href="/dashboard/projects/new"><Button variant="outline">New Project</Button></Link>
      </div>
    </div>
  );
}
