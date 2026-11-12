"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Search, Edit } from "lucide-react";
import Link from "next/link";

interface Release {
  id: string;
  title: string;
  slug: string;
  type: string;
  releaseFormat: string | null;
  description: string | null;
  status: string;
  contentStatus: string;
  releaseDate: string | null;
  createdAt: string;
}

interface ReleaseListResponse {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUSES = ["", "draft", "published", "archived"];
const TYPES = ["", "nasheed", "tilawat", "acting", "podcast", "interview", "documentary"];
const FORMATS = ["", "single", "ep", "album"];

export default function ReleasesListPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReleaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [type, setType] = useState(searchParams.get("type") || "");
  const [format, setFormat] = useState(searchParams.get("format") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const fetchReleases = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (format) params.set("format", format);
    params.set("page", String(page));
    params.set("pageSize", "20");

    fetch(`/api/releases?${params.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReleases();
  }, [page, status, type, format]);

  const handleSearch = () => {
    setPage(1);
    fetchReleases();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Releases</h1>
        <Link href="/dashboard/releases/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Release</Button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
          <Input
            placeholder="Search releases..."
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
            {STATUSES.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.filter(Boolean).map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={format || "all"} onValueChange={(v) => { setFormat(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Formats" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {FORMATS.filter(Boolean).map((f) => (
              <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}><Search size={14} /></Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.releases.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No releases found</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.releases.map((release) => (
              <Card key={release.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {release.title || release.slug}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {release.type ? `${release.type}` : ""}
                      {release.releaseFormat ? ` | ${release.releaseFormat}` : ""}
                      {release.releaseDate ? ` | ${release.releaseDate}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge>{release.status}</Badge>
                    <Badge variant="outline">{release.contentStatus || release.status}</Badge>
                    <Link href={`/dashboard/releases/${release.id}`}>
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
            {data.total} total releases
          </div>
        </>
      )}
    </div>
  );
}
