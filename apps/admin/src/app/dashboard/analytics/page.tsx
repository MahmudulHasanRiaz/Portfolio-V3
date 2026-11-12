"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@repo/ui";
import Link from "next/link";

interface Summary {
  totalVisitors: number;
  totalPageViews: number;
  totalSessions: number;
}

interface TopPage {
  path: string;
  views: number;
}

interface TopReferrer {
  referrer: string;
  count: number;
}

interface UTMPerformance {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  visits: number;
  leads: number;
}

export default function AnalyticsOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [topUtm, setTopUtm] = useState<UTMPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics/summary?days=${days}`).then(r => r.json()),
      fetch(`/api/analytics/pages?limit=5&days=${days}`).then(r => r.json()),
      fetch(`/api/analytics/referrers?limit=5&days=${days}`).then(r => r.json()),
      fetch(`/api/analytics/utm?limit=5&days=${days}`).then(r => r.json()),
    ])
      .then(([summaryData, pagesData, referrersData, utmData]) => {
        setSummary(summaryData);
        setTopPages(pagesData.pages || []);
        setTopReferrers(referrersData.referrers || []);
        setTopUtm(utmData.utmData || []);
      })
      .catch(() => {
        setSummary(null);
        setTopPages([]);
        setTopReferrers([]);
        setTopUtm([]);
      })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Analytics</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Traffic and performance metrics overview</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: "6px 14px", borderRadius: 6, border: days === d ? "2px solid var(--accent-info)" : "1px solid var(--border)", background: days === d ? "var(--accent-info)" : "transparent", color: days === d ? "#fff" : "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Visitors</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{summary?.totalVisitors ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Page Views</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{summary?.totalPageViews ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Sessions</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{summary?.totalSessions ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Top Page</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-all" }}>{topPages[0]?.path ?? "—"}</div>
                {topPages[0] && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{topPages[0].views} views</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Top Referrer</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{topReferrers[0]?.referrer ?? "—"}</div>
                {topReferrers[0] && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{topReferrers[0].count} visits</div>}
              </CardContent>
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Top Pages</h3>
                  <Link href="/dashboard/analytics/pages" style={{ fontSize: 13, color: "var(--accent-info)", textDecoration: "none" }}>View all</Link>
                </div>
                {topPages.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data yet.</p>
                ) : (
                  <div>
                    {topPages.map((page, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < topPages.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <span style={{ fontSize: 14, color: "var(--text-primary)", wordBreak: "break-all" }}>{page.path}</span>
                        <span style={{ fontSize: 14, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>{page.views}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Top Referrers</h3>
                  <Link href="/dashboard/analytics/referrers" style={{ fontSize: 13, color: "var(--accent-info)", textDecoration: "none" }}>View all</Link>
                </div>
                {topReferrers.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data yet.</p>
                ) : (
                  <div>
                    {topReferrers.map((ref, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < topReferrers.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{ref.referrer}</span>
                        <span style={{ fontSize: 14, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>{ref.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Top UTM Campaigns</h3>
                  <Link href="/dashboard/analytics/utm" style={{ fontSize: 13, color: "var(--accent-info)", textDecoration: "none" }}>View all</Link>
                </div>
                {topUtm.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data yet.</p>
                ) : (
                  <div>
                    {topUtm.map((utm, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < topUtm.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div>
                          <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{utm.utmCampaign}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{utm.utmSource} / {utm.utmMedium}</div>
                        </div>
                        <span style={{ fontSize: 14, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>{utm.visits}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
