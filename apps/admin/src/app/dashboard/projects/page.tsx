import { listContent } from "@/actions/content";
import { Card, CardContent, Badge, Button, Input } from "@repo/ui";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import { ListThumb } from "@/components/list-thumb";

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function ProjectsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "";

  const result = await listContent("projects", { page, search, status, pageSize: 20 });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Projects</h1>
        <Link href="/dashboard/projects/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Project</Button>
        </Link>
      </div>

      <form method="get" action="/dashboard/projects" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="search" defaultValue={search} placeholder="Search projects…" style={{ maxWidth: 320 }} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "draft", "published", "archived"].map((s) => {
          const qs = new URLSearchParams();
          if (s !== "all") qs.set("status", s);
          if (search) qs.set("search", search);
          const href = qs.toString() ? `/dashboard/projects?${qs.toString()}` : "/dashboard/projects";
          return (
            <Link key={s} href={href}>
              <Badge variant={params.status === s || (s === "all" && !params.status) ? "default" : "outline"}>{s}</Badge>
            </Link>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No projects found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.items.map((project) => (
            <Card key={project.id as string}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                {((project.thumbnailUrl || project.thumbnail) as string) ? (
                  <ListThumb src={(project.thumbnailUrl || project.thumbnail) as string} alt={(project.title as string) || ""} />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{(project.title as string) || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {project.clientName ? `Client: ${project.clientName as string}` : ""}
                    {project.industry ? ` | ${project.industry as string}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge>{project.status as string}</Badge>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Button variant="outline" size="sm"><Edit size={14} /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result.pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          {Array.from({ length: result.pagination.totalPages }, (_, i) => i + 1).map((p) => {
            const qs = new URLSearchParams({ page: String(p) });
            if (status) qs.set("status", status);
            if (search) qs.set("search", search);
            return (
              <Link key={p} href={`/dashboard/projects?${qs.toString()}`}>
                <Button variant={p === page ? "default" : "outline"} size="sm">{p}</Button>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
        {result.pagination.total} total projects
      </div>
    </div>
  );
}
