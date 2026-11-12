"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

interface ActivityData {
  id: string;
  activityType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  lead_created: "➕",
  lead_updated: "✏️",
  status_changed: "🔄",
  lead_assigned: "👤",
  note_added: "📝",
  note_deleted: "🗑️",
};

interface LeadActivitiesProps {
  activities: ActivityData[];
}

export function LeadActivities({ activities }: LeadActivitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 14 }}>No activity yet</div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, backgroundColor: "var(--border)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activities.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-card)",
                    border: "2px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    zIndex: 1,
                    fontSize: 14,
                  }}>
                    {ACTIVITY_ICONS[a.activityType] || "📌"}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{a.description}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
