import { Card, CardContent, Badge, Button, Input } from "@repo/ui";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import {
  listPlatforms,
  listTechnologies,
  listClients,
  type PlatformRow,
  type TechnologyRow,
  type ClientRow,
} from "@/actions/directory";

// Shared list UI for the public-site directory tables (Platforms /
// Technologies / Clients). The list page for each entity is a thin server
// wrapper around this component.

export type DirectoryEntity = "platforms" | "technologies" | "clients";

const META: Record<
  DirectoryEntity,
  { title: string; singular: string; newHref: string; editBase: string }
> = {
  platforms: {
    title: "Platforms",
    singular: "platform",
    newHref: "/dashboard/platforms/new",
    editBase: "/dashboard/platforms",
  },
  technologies: {
    title: "Technologies",
    singular: "technology",
    newHref: "/dashboard/technologies/new",
    editBase: "/dashboard/technologies",
  },
  clients: {
    title: "Clients",
    singular: "client",
    newHref: "/dashboard/clients/new",
    editBase: "/dashboard/clients",
  },
};

function RowCard({
  title,
  sub,
  badges,
  editHref,
  thumb,
}: {
  title: string;
  sub: string;
  badges: string[];
  editHref: string;
  thumb?: string | null;
}) {
  return (
    <Card>
      <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {badges.map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
          <Link href={editHref}>
            <Button variant="outline" size="sm"><Edit size={14} /></Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export async function DirectoryList({
  entity,
  search,
}: {
  entity: DirectoryEntity;
  search: string;
}) {
  const meta = META[entity];

  if (entity === "platforms") {
    const rows = await listPlatforms({ search });
    return (
      <DirectoryShell entity={entity} search={search}>
        {rows.map((row: PlatformRow) => (
          <RowCard
            key={row.id}
            title={row.name}
            sub={`${row.url}${row.handle ? ` · ${row.handle}` : ""}${row.subtitle ? ` — ${row.subtitle}` : ""}`}
            badges={[
              row.group,
              ...(row.isPrimary ? ["primary"] : []),
              ...(row.sortOrder !== null ? [`order ${row.sortOrder}`] : []),
            ]}
            editHref={`${meta.editBase}/${row.id}`}
          />
        ))}
        {rows.length === 0 && <EmptyState singular={meta.singular} />}
      </DirectoryShell>
    );
  }

  if (entity === "technologies") {
    const rows = await listTechnologies({ search });
    return (
      <DirectoryShell entity={entity} search={search}>
        {rows.map((row: TechnologyRow) => (
          <RowCard
            key={row.id}
            title={row.name}
            sub={`${row.category ?? "No category"}${row.use ? ` — ${row.use}` : ""}${row.icon ? ` · ${row.icon}` : ""}`}
            badges={[
              ...(row.category ? [row.category] : []),
              ...(row.sortOrder !== null ? [`order ${row.sortOrder}`] : []),
            ]}
            editHref={`${meta.editBase}/${row.id}`}
          />
        ))}
        {rows.length === 0 && <EmptyState singular={meta.singular} />}
      </DirectoryShell>
    );
  }

  const rows = await listClients({ search });
  return (
    <DirectoryShell entity={entity} search={search}>
      {rows.map((row: ClientRow) => (
        <RowCard
          key={row.id}
          title={row.name}
          sub={`${row.website ?? "No website"}${row.nameBn ? ` · ${row.nameBn}` : ""}`}
          badges={[...(row.sortOrder !== null ? [`order ${row.sortOrder}`] : [])]}
          editHref={`${meta.editBase}/${row.id}`}
          thumb={row.logoUrl}
        />
      ))}
      {rows.length === 0 && <EmptyState singular={meta.singular} />}
    </DirectoryShell>
  );
}

function EmptyState({ singular }: { singular: string }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
      No {singular}s found
    </div>
  );
}

function DirectoryShell({
  entity,
  search,
  children,
}: {
  entity: DirectoryEntity;
  search: string;
  children: React.ReactNode;
}) {
  const meta = META[entity];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{meta.title}</h1>
        <Link href={meta.newHref}>
          <Button><Plus size={16} style={{ marginRight: 6 }} />New {meta.singular === "technology" ? "Technology" : meta.singular.charAt(0).toUpperCase() + meta.singular.slice(1)}</Button>
        </Link>
      </div>

      <form method="get" action={`/dashboard/${entity}`} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Input name="search" defaultValue={search} placeholder={`Search ${meta.title.toLowerCase()}…`} style={{ maxWidth: 320 }} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}
