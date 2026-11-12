import { Card, CardContent } from "@repo/ui";

export default function SitemapPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Sitemap Status</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        Sitemap and robots.txt are auto-generated from published content.
        Both honor the search-indexing switch (Settings → Search Engine
        Indexing): while indexing is off, the sitemap is empty and
        robots.txt disallows all crawlers.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        <Card>
          <CardContent style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Sitemap</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              XML sitemap including all published content. Auto-generated on each request.
            </p>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--accent-info)", fontSize: 14 }}>
              /sitemap.xml →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Robots.txt</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Search engine crawling rules. Blocks crawlers when search
              indexing is off, and in non-production environments.
            </p>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--accent-info)", fontSize: 14 }}>
              /robots.txt →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Content Coverage</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              The sitemap includes: Pages, Blog Posts, Services, Projects, Ventures, Releases.
              Only published content is included. Drafts and archived content are excluded.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
