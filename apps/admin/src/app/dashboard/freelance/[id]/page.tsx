"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Project {
  id: string;
  title: string | null;
  clientId: string | null;
  status: string;
  description: string | null;
  scopeNotes: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  totalAgreedAmount: string | null;
  currency: string | null;
  isPaidProject: boolean | null;
  portalAccessEnabled: boolean | null;
  portalToken: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Milestone { id: string; projectId: string; title: string | null; description: string | null; dueDate: string | null; status: string; sortOrder: number | null; }

interface Deliverable { id: string; projectId: string; milestoneId: string | null; title: string | null; fileUrl: string | null; notes: string | null; status: string; submittedAt: string | null; }

interface Activity { id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string | null; }

const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "approved"];
const DELIVERABLE_STATUSES = ["pending", "submitted", "approved", "revision_requested"];

export default function FreelanceProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "milestone" | "deliverable"; id: string; title: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError("");
    const okJson = async (url: string) => {
      const r = await fetch(url);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `Failed to load ${url}`);
      return json;
    };
    Promise.all([
      okJson(`/api/freelance/projects/${params.id}`),
      okJson(`/api/freelance/projects/${params.id}/milestones`).catch(() => []),
      okJson(`/api/freelance/projects/${params.id}/deliverables`).catch(() => ({ deliverables: [] })),
      okJson(`/api/freelance/projects/${params.id}/activities`).catch(() => ({ activities: [] })),
    ])
      .then(([proj, ms, dels, acts]) => {
        setProject(proj);
        setMilestones(Array.isArray(ms) ? ms : ms?.milestones || []);
        setDeliverables(Array.isArray(dels) ? dels : dels?.deliverables || []);
        setActivities(Array.isArray(acts) ? acts : acts?.activities || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load project"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [params.id]);

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update status");
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to delete");
      }
      router.push("/dashboard/freelance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleTogglePortal() {
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}/portal`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to toggle portal");
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle portal");
    }
  }

  async function handleMilestoneStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}/milestones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update milestone");
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update milestone");
    }
  }

  async function handleDeliverableStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}/deliverables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update deliverable");
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deliverable");
    }
  }

  async function handleDeleteTarget() {
    if (!deleteTarget) return;
    const segment = deleteTarget.kind === "milestone" ? "milestones" : "deliverables";
    try {
      const res = await fetch(`/api/freelance/projects/${params.id}/${segment}/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Failed to delete ${deleteTarget.kind}`);
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${deleteTarget.kind}`);
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;

  if (!project) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Project not found</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/freelance")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {project.title || "Untitled Project"}
        </h1>
        <Badge variant={project.status === "completed" ? "success" : project.status === "in_progress" ? "default" : "secondary"}>
          {project.status?.replace(/_/g, " ")}
        </Badge>
        {project.portalAccessEnabled && <Badge variant="success">Portal Active</Badge>}
        <Link href={`/dashboard/freelance/${project.id}/edit`}>
          <Button variant="outline" size="sm"><Edit size={14} /></Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(true)}><Trash2 size={14} /></Button>
      </div>

      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>{error}</div>}

      <Tabs defaultValue="overview">
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {project.description && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Description</div>
                      <div style={{ fontSize: 14 }}>{project.description}</div>
                    </div>
                  )}
                  {project.scopeNotes && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Scope Notes</div>
                      <div style={{ fontSize: 14 }}>{project.scopeNotes}</div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Start Date</div>
                      <div style={{ fontSize: 14 }}>{project.startDate || "Not set"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Expected End</div>
                      <div style={{ fontSize: 14 }}>{project.expectedEndDate || "Not set"}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Amount</div>
                      <div style={{ fontSize: 14 }}>{project.totalAgreedAmount ? `${project.currency || "USD"} ${project.totalAgreedAmount}` : "Not set"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Status</div>
                      <div style={{ fontSize: 14 }}>
                        <select value={project.status} onChange={(e) => handleStatusChange(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
                          <option value="draft">Draft</option>
                          <option value="in_progress">In Progress</option>
                          <option value="under_review">Under Review</option>
                          <option value="revision_requested">Revision Requested</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card>
                <CardHeader><CardTitle>Portal Access</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ fontSize: 14, marginBottom: 12 }}>
                    Status: {project.portalAccessEnabled ? "Enabled" : "Disabled"}
                  </div>
                  <Button variant={project.portalAccessEnabled ? "outline" : "default"} size="sm" onClick={handleTogglePortal}>
                    {project.portalAccessEnabled ? "Disable Portal" : "Enable Portal"}
                  </Button>
                  {project.portalAccessEnabled && project.portalToken && (
                    <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                      <div>Token: <code style={{ wordBreak: "break-all" }}>{project.portalToken}</code></div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>Milestones: {milestones.length}</div>
                    <div>Deliverables: {deliverables.length}</div>
                    <div>Activities: {activities.length}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <AddMilestoneDialog projectId={project.id} onCreated={fetchData} />
          </div>
          {milestones.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No milestones yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {milestones.map((ms) => (
                <Card key={ms.id}>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{ms.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {ms.dueDate ? `Due: ${ms.dueDate}` : ""}{ms.description ? ` | ${ms.description.substring(0, 100)}` : ""}
                      </div>
                    </div>
                    <select
                      value={ms.status}
                      onChange={(e) => void handleMilestoneStatus(ms.id, e.target.value)}
                      aria-label={`Status for ${ms.title || "milestone"}`}
                      style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--bg)", color: "var(--text-primary)" }}
                    >
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget({ kind: "milestone", id: ms.id, title: ms.title || "this milestone" })} aria-label={`Delete ${ms.title || "milestone"}`}><Trash2 size={14} /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliverables">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <AddDeliverableDialog projectId={project.id} milestones={milestones} onCreated={fetchData} />
          </div>
          {deliverables.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No deliverables yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deliverables.map((d) => (
                <Card key={d.id}>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{d.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {d.submittedAt ? `Submitted: ${new Date(d.submittedAt).toLocaleDateString()}` : "Not submitted"}{d.fileUrl ? " | File attached" : ""}{d.notes ? ` | ${d.notes.substring(0, 100)}` : ""}
                      </div>
                      {d.fileUrl && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          <a href={d.fileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand, #0c7c6c)" }}>Open file</a>
                        </div>
                      )}
                    </div>
                    <select
                      value={d.status}
                      onChange={(e) => void handleDeliverableStatus(d.id, e.target.value)}
                      aria-label={`Status for ${d.title || "deliverable"}`}
                      style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, background: "var(--bg)", color: "var(--text-primary)" }}
                    >
                      {DELIVERABLE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget({ kind: "deliverable", id: d.id, title: d.title || "this deliverable" })} aria-label={`Delete ${d.title || "deliverable"}`}><Trash2 size={14} /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No activity yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activities.map((a) => (
                <Card key={a.id}>
                  <CardContent style={{ padding: "8px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ fontSize: 14, flex: 1 }}>{a.action}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete project"
        message="Delete this project?"
        onConfirm={() => void handleDelete()}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={deleteTarget?.kind === "milestone" ? "Delete milestone" : "Delete deliverable"}
        message={deleteTarget ? `Delete "${deleteTarget.title}"?` : ""}
        onConfirm={() => void handleDeleteTarget()}
      />
    </div>
  );
}

function AddMilestoneDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/freelance/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, dueDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to add milestone");
      }
      setOpen(false);
      setTitle(""); setDescription(""); setDueDate("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add milestone");
    }
    finally { setLoading(false); }
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} style={{ marginRight: 4 }} />Add Milestone</Button>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "var(--background)", borderRadius: 12, padding: 24, width: 400, maxWidth: "90vw" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>New Milestone</h3>
        {error && <div style={{ padding: 10, marginBottom: 12, borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Adding..." : "Add"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDeliverableDialog({ projectId, milestones, onCreated }: { projectId: string; milestones: Milestone[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/freelance/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, milestoneId: milestoneId || null, fileUrl, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to add deliverable");
      }
      setOpen(false);
      setTitle(""); setMilestoneId(""); setFileUrl(""); setNotes("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add deliverable");
    }
    finally { setLoading(false); }
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} style={{ marginRight: 4 }} />Add Deliverable</Button>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "var(--background)", borderRadius: 12, padding: 24, width: 400, maxWidth: "90vw" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>New Deliverable</h3>
        {error && <div style={{ padding: 10, marginBottom: 12, borderRadius: 6, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Milestone</label>
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }}>
              <option value="">No milestone</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.title || "Untitled milestone"}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>File URL</label>
            <input type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "var(--bg)", color: "var(--text-primary)" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Adding..." : "Add"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
