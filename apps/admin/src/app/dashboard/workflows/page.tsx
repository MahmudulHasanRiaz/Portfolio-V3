"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Badge, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Search, Edit, Activity } from "lucide-react";
import Link from "next/link";

interface Workflow {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  version: number;
  maxRetries: number;
  createdAt: string;
}

interface WorkflowListResponse {
  items: Workflow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TRIGGER_TYPES = [
  "",
  "lead_created",
  "lead_status_changed",
  "form_submitted",
  "content_published",
  "venture_published",
  "release_published",
  "proposal_accepted",
  "invoice_paid",
  "payment_received",
  "portal_message_received",
];

export default function WorkflowsListPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<WorkflowListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [triggerType, setTriggerType] = useState(searchParams.get("triggerType") || "");
  const [isActive, setIsActive] = useState(searchParams.get("isActive") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const fetchWorkflows = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (triggerType) params.set("triggerType", triggerType);
    if (isActive) params.set("isActive", isActive);
    params.set("page", String(page));
    params.set("pageSize", "20");

    fetch(`/api/workflows?${params.toString()}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !Array.isArray(json.items)) throw new Error(json.error || "Failed to fetch workflows");
        return json;
      })
      .then(setData)
      .catch(() => setData({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflows();
  }, [page, triggerType, isActive]);

  const handleSearch = () => {
    setPage(1);
    fetchWorkflows();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Workflows</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard/workflows/runs">
            <Button variant="outline"><Activity size={16} style={{ marginRight: 6 }} />All Runs</Button>
          </Link>
          <Link href="/dashboard/workflows/new">
            <Button><Plus size={16} style={{ marginRight: 6 }} />New Workflow</Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select value={triggerType || "all"} onValueChange={(v) => { setTriggerType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Triggers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            {TRIGGER_TYPES.filter(Boolean).map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isActive || "all"} onValueChange={(v) => { setIsActive(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}><Search size={14} /></Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No workflows found</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.items.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {workflow.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {workflow.triggerType.replace(/_/g, " ")} | v{workflow.version} | Max retries: {workflow.maxRetries}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge>{workflow.isActive ? "Active" : "Inactive"}</Badge>
                    <Link href={`/dashboard/workflows/${workflow.id}`}>
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
            {data.total} total workflows
          </div>
        </>
      )}
    </div>
  );
}
