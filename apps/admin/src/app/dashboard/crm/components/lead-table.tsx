"use client";

import { useState, useEffect } from "react";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, Button, Card, CardContent } from "@repo/ui";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface LeadRow {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  leadSource: string | null;
  status: string;
  assignedUserId: string | null;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  qualified: "default",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
  archived: "outline",
};

interface LeadTableProps {
  refreshKey: number;
}

export function LeadTable({ refreshKey }: LeadTableProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search: without this every keystroke fired a list fetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);

    fetch(`/api/leads?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setLeads(data.leads ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setError("Could not load leads."))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, statusFilter, sourceFilter, refreshKey]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger style={{ width: 160 }}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger style={{ width: 160 }}>
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="contact_form">Contact Form</SelectItem>
            <SelectItem value="consultation_form">Consultation Form</SelectItem>
            <SelectItem value="hiring_form">Hiring Form</SelectItem>
            <SelectItem value="artist_booking_form">Artist Booking</SelectItem>
            <SelectItem value="partnership_form">Partnership</SelectItem>
            <SelectItem value="newsletter_conversion">Newsletter</SelectItem>
            <SelectItem value="manual_entry">Manual Entry</SelectItem>
            <SelectItem value="imported_lead">Imported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--danger, #c0392b)" }}>{error}</div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No leads found</div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                      onClick={() => window.location.href = `/dashboard/crm/leads/${lead.id}`}>
                      {lead.fullName || "Unnamed Lead"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {lead.email && <span>{lead.email}</span>}
                      {lead.company && <span>{lead.email ? " · " : ""}{lead.company}</span>}
                      {lead.createdAt && <span> · {new Date(lead.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {lead.leadSource && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.leadSource.replace(/_/g, " ")}</span>
                    )}
                    <Badge variant={STATUS_VARIANTS[lead.status] || "outline"}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 24 }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} style={{ marginRight: 4 }} /> Previous
              </Button>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight size={14} style={{ marginLeft: 4 }} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
