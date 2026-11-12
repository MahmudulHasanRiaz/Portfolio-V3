"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

interface UtmData {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
}

interface LeadUtmProps {
  lead: UtmData;
}

export function LeadUtm({ lead }: LeadUtmProps) {
  const hasUtm = lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent || lead.utmTerm;

  return (
    <Card>
      <CardHeader>
        <CardTitle>UTM Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasUtm ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
            No UTM data captured
          </div>
        ) : (
          <div>
            {lead.utmSource && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Source</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{lead.utmSource}</div>
              </div>
            )}
            {lead.utmMedium && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Medium</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{lead.utmMedium}</div>
              </div>
            )}
            {lead.utmCampaign && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Campaign</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{lead.utmCampaign}</div>
              </div>
            )}
            {lead.utmContent && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Content</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{lead.utmContent}</div>
              </div>
            )}
            {lead.utmTerm && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Term</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{lead.utmTerm}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
