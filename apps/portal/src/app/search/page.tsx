"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { Input, Badge, Card, CardContent, Pagination } from "@repo/ui";

interface SearchResultItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  summary: string;
  url: string;
  thumbnail: string;
  publishedAt: string | null;
  contentType: string | null;
  headline: string;
}

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    service: "Service",
    project: "Project",
    post: "Blog Post",
    case_study: "Case Study",
    page: "Page",
    resource: "Resource",
    faq: "FAQ",
    testimonial: "Testimonial",
  };
  return labels[type] || type;
}

function cleanHeadline(headline: string): string {
  return headline.replace(/<\/?mark>/g, "").substring(0, 300);
}

function PortalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}&pageSize=10`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, 1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
    doSearch(q, 1);
  }

  function handlePageChange(newPage: number) {
    const q = query.trim();
    router.push(`/search?q=${encodeURIComponent(q)}&page=${newPage}`, { scroll: false });
    doSearch(q, newPage);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Search
      </h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24, position: "relative" }}>
        <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, projects, posts..."
          style={{ paddingLeft: 40, height: 44, fontSize: 15 }}
          autoFocus={!initialQuery}
        />
      </form>

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Searching...
        </div>
      )}

      {!loading && !searched && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Enter a search term to find content
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <SearchX size={40} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No results found</div>
          <div style={{ fontSize: 14 }}>Try a different search term</div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            {total} result{total !== 1 ? "s" : ""} for "{query}"
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((item) => (
              <Link key={item.id} href={item.url} style={{ textDecoration: "none" }} target={item.url.startsWith("http") ? "_blank" : undefined} rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}>
                <Card>
                  <CardContent style={{ padding: 20 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      {item.thumbnail && (
                        <img
                          src={item.thumbnail}
                          alt=""
                          style={{ width: 80, height: 60, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Badge variant="secondary" style={{ fontSize: 11 }}>
                            {entityTypeLabel(item.entityType)}
                          </Badge>
                          {item.contentType && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {item.contentType}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                          {item.title}
                        </div>
                        {item.headline && (
                          <div
                            style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}
                            dangerouslySetInnerHTML={{ __html: cleanHeadline(item.headline) }}
                          />
                        )}
                        {!item.headline && item.summary && (
                          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                            {item.summary.substring(0, 200)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ marginTop: 24 }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  );
}


export default function PortalSearchPage() {
  return (
    <Suspense>
      <PortalSearch />
    </Suspense>
  );
}
