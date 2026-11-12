"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Search, Edit } from "lucide-react";
import Link from "next/link";

interface Venture {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  industry: string | null;
  stage: string | null;
  status: string;
  contentStatus: string;
  createdAt: string;
}

interface VentureListResponse {
  ventures: Venture[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const VENTURE_STATUSES = ["", "active", "paused", "acquired", "closed"];
const CONTENT_STATUSES = ["", "draft", "published", "archived"];

export default function VenturesListPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<VentureListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [contentStatus, setContentStatus] = useState(searchParams.get("contentStatus") || "");
  const [industry] = useState(searchParams.get("industry") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const fetchVentures = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (contentStatus) params.set("contentStatus", contentStatus);
    if (industry) params.set("industry", industry);
    params.set("page", String(page));
    params.set("pageSize", "20");

    fetch(`/api/ventures?${params.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVentures();
  }, [page, status, contentStatus, industry]);

  const handleSearch = () => {
    setPage(1);
    fetchVentures();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Ventures</h1>
        <Link href="/dashboard/ventures/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Venture</Button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
          <Input
            placeholder="Search ventures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {VENTURE_STATUSES.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contentStatus || "all"} onValueChange={(v) => { setContentStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Content" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            {CONTENT_STATUSES.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}><Search size={14} /></Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.ventures.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No ventures found</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.ventures.map((venture) => (
              <Card key={venture.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {venture.name || venture.slug}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {venture.industry ? `${venture.industry}` : ""}
                      {venture.stage ? ` | ${venture.stage}` : ""}
                      {venture.website ? ` | ${venture.website}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge>{venture.status}</Badge>
                    <Badge variant="outline">{venture.contentStatus}</Badge>
                    <Link href={`/dashboard/ventures/${venture.id}`}>
                      <Button variant="outline" size="sm"><Edit size={14} /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >{p}</Button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
            {data.total} total ventures
          </div>
        </>
      )}
    </div>
  );
}
