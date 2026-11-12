"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SearchX, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui";

interface SearchResultItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  summary: string;
  url: string;
  headline: string;
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

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&pageSize=5`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleViewAll() {
    if (query.trim()) {
      onOpenChange(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560, top: "15%", transform: "translateX(-50%)", padding: 0, gap: 0 }}>
        <DialogTitle style={{ display: "none" }}>Search</DialogTitle>
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "12px 16px" }}>
          <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search services, projects, posts..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleViewAll();
            }}
            style={{
              flex: 1, marginLeft: 10, border: "none", outline: "none", fontSize: 15,
              background: "transparent", color: "var(--text-primary)",
              fontFamily: "inherit",
            }}
          />
          <kbd style={{
            fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)",
            color: "var(--text-muted)", background: "var(--muted)", flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto", padding: results.length > 0 ? "8px" : 0 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <SearchX size={28} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>No results found</div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => onOpenChange(false)}
                  target={item.url.startsWith("http") ? "_blank" : undefined}
                  rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                      borderRadius: 6, cursor: "pointer", transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 4,
                          backgroundColor: "var(--muted)", color: "var(--text-muted)",
                        }}>
                          {entityTypeLabel(item.entityType)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
                        {item.title}
                      </div>
                      {item.headline && (
                        <div
                          style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          dangerouslySetInnerHTML={{ __html: item.headline.replace(/<\/?mark>/g, "").substring(0, 150) }}
                        />
                      )}
                    </div>
                    <ExternalLink size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "8px 12px", textAlign: "center" }}>
            <button
              onClick={handleViewAll}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 13,
                color: "var(--text-muted)", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              View all results &rarr;
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
