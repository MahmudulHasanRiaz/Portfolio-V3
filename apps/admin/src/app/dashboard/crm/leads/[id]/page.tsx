"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { LeadProfile } from "./components/lead-profile";
import { LeadNotes } from "./components/lead-notes";
import { LeadActivities } from "./components/lead-activities";
import { LeadUtm } from "./components/lead-utm";
import { LeadStatusBadge } from "./components/lead-status-badge";

interface LeadData {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  timeline: string | null;
  projectType: string | null;
  inquiryType: string | null;
  message: string | null;
  leadSource: string | null;
  status: string;
  assignedUserId: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
  convertedToProjectId: string | null;
  convertedToEventId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  slaMinutes: number | null;
  firstResponseAt: string | null;
  responseStatus: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notes: any[];
  activities: any[];
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = () => {
    setLoading(true);
    fetch(`/api/leads/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setLead(data))
      .catch(() => router.push("/dashboard/crm"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLead();
  }, [params.id]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!lead) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Lead not found</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/crm")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {lead.fullName || "Unnamed Lead"}
        </h1>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <LeadProfile lead={lead} onUpdate={fetchLead} />
          <LeadUtm lead={lead} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <LeadNotes leadId={lead.id} notes={lead.notes} onUpdate={fetchLead} />
          <LeadActivities activities={lead.activities} />
        </div>
      </div>
    </div>
  );
}
