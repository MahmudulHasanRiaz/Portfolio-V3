import { listContent } from "@/actions/content";
import { Card, CardContent, Badge, Button } from "@repo/ui";
import Link from "next/link";
import { Edit } from "lucide-react";
import { NewPageButton, DeletePageButton } from "./page-actions";

interface Props { searchParams: Promise<{ page?: string; status?: string }> }

export default async function PagesListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = params.status || "";
  const result = await listContent("pages", { page, status, pageSize: 20 });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Pages</h1>
        <NewPageButton />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "draft", "published", "archived"].map((s) => (
          <Link key={s} href={`/dashboard/content/pages${s === "all" ? "" : `?status=${s}`}`}>
            <Badge variant={status === s || (s === "all" && !status) ? "default" : "outline"}>{s}</Badge>
          </Link>
        ))}
      </div>
      {result.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No pages found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.items.map((page) => (
            <Card key={page.id as string}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{(page.title as string) || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>/{page.slug as string}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge>{page.status as string}</Badge>
                  <Link href={`/dashboard/content/pages/${page.id}`}><Button variant="outline" size="sm"><Edit size={14} /></Button></Link>
                  <DeletePageButton id={page.id as string} title={(page.title as string) || "Untitled"} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
