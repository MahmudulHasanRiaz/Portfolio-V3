"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";
import { History, RotateCcw, Eye } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Revision {
  id: string;
  entityType: string;
  entityId: string;
  revisionNumber: number;
  contentSnapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

const ENTITY_TYPES = [
  { value: "", label: "All types" },
  { value: "posts", label: "Blog Posts" },
  { value: "projects", label: "Projects" },
  { value: "services", label: "Services" },
  { value: "pages", label: "Pages" },
  { value: "case_studies", label: "Case Studies" },
] as const;

function entityHref(revision: Revision): string {
  switch (revision.entityType) {
    case "posts":
      return `/dashboard/blog/${revision.entityId}`;
    case "projects":
      return `/dashboard/projects/${revision.entityId}`;
    case "services":
      return `/dashboard/services/${revision.entityId}`;
    case "pages":
      return `/dashboard/content/pages/${revision.entityId}`;
    case "case_studies":
      return `/dashboard/content/case-studies/${revision.entityId}`;
    default:
      return "/dashboard/content";
  }
}

function revisionTitle(revision: Revision): string {
  const snap = revision.contentSnapshot ?? {};
  const title = snap.title ?? snap.name;
  if (typeof title === "string" && title.trim()) return title;
  const slug = snap.slug;
  if (typeof slug === "string" && slug.trim()) return slug;
  return revision.entityId.slice(0, 8);
}

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewing, setViewing] = useState<Revision | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async (pageNum: number, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: "20" });
      if (type) params.set("entityType", type);
      const res = await fetch(`/api/revisions?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setRevisions(data.items || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setLoadError("");
    } catch {
      setLoadError("Could not load revisions — please reload the page.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(page, entityType); }, [load, page, entityType]);

  function handleFilter(type: string) {
    setEntityType(type);
    setPage(1);
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/revisions/${restoreTarget.id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("restore failed");
      setNotice(`Revision #${restoreTarget.revisionNumber} of "${revisionTitle(restoreTarget)}" restored. The pre-restore state was saved as a new revision.`);
      setRestoreTarget(null);
      await load(page, entityType);
    } catch {
      setError("Could not restore that revision — please try again.");
      setRestoreTarget(null);
    }
    setRestoring(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <History size={24} style={{ color: "var(--text-primary)" }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Revisions</h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
        A revision is captured automatically every time content is updated. Restore any revision to bring that content back — the state before the restore is saved as a new revision.
      </p>

      {loadError && (
        <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--destructive-soft, #fef2f2)", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
          {loadError}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--destructive-soft, #fef2f2)", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--accent-soft, #f0fdfa)", color: "var(--accent-ink, #0f766e)", fontSize: 13, marginBottom: 16 }}>
          {notice}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {ENTITY_TYPES.map((t) => (
          <Button
            key={t.value || "all"}
            variant={entityType === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading...</div>
      ) : revisions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          No revisions captured yet{entityType ? " for this content type" : ""}. Revisions appear here once content is updated.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            Showing {revisions.length} of {total} revisions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {revisions.map((revision) => (
              <Card key={revision.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link href={entityHref(revision)} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                        {revisionTitle(revision)}
                      </Link>
                      <Badge variant="outline">{revision.entityType}</Badge>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Revision #{revision.revisionNumber}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {new Date(revision.createdAt).toLocaleString()}
                      {revision.createdBy ? ` · by ${revision.createdBy.slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button variant="outline" size="sm" onClick={() => setViewing(revision)}>
                      <Eye size={14} style={{ marginRight: 4 }} />Snapshot
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRestoreTarget(revision)}>
                      <RotateCcw size={14} style={{ marginRight: 4 }} />Restore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Snapshot — {viewing ? revisionTitle(viewing) : ""} (Revision #{viewing?.revisionNumber})
            </DialogTitle>
          </DialogHeader>
          <pre style={{ maxHeight: "60vh", overflow: "auto", fontSize: 12, backgroundColor: "var(--bg-secondary)", padding: 12, borderRadius: 8, color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {viewing ? JSON.stringify(viewing.contentSnapshot, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
        title="Restore this revision?"
        message={restoreTarget ? `"${revisionTitle(restoreTarget)}" will be reverted to revision #${restoreTarget.revisionNumber}. The current state is saved as a new revision first, so nothing is lost.` : ""}
        confirmLabel="Restore revision"
        variant="neutral"
        busy={restoring}
        busyLabel="Restoring..."
        onConfirm={handleRestore}
      />
    </div>
  );
}
