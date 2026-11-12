"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { ArrowLeft, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string; title: string | null; status: string; description: string | null;
  scopeNotes: string | null; startDate: string | null; expectedEndDate: string | null;
  totalAgreedAmount: string | null; currency: string | null;
}

interface Milestone { id: string; title: string | null; description: string | null; dueDate: string | null; status: string; }
interface Deliverable { id: string; title: string | null; fileUrl: string | null; status: string; submittedAt: string | null; }
interface Activity { id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string | null; }

export default function PortalProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/milestones`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/deliverables`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/activities`).then((r) => r.json()),
    ])
      .then(([proj, ms, dels, acts]) => {
        setProject(proj);
        setMilestones(ms.milestones || ms || []);
        setDeliverables(dels.deliverables || dels || []);
        setActivities(acts.activities || acts || []);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading project...</div>;
  if (!project) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Project not found</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{project.title || "Project"}</h1>
        <Badge variant={project.status === "completed" ? "success" : project.status === "in_progress" ? "default" : "secondary"}>
          {project.status?.replace(/_/g, " ")}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables ({deliverables.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
              {project.description && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{project.description}</div>
                </div>
              )}
              {project.scopeNotes && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Scope Notes</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{project.scopeNotes}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={14} /> Start Date
                  </div>
                  <div style={{ fontSize: 14 }}>{project.startDate || "Not set"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={14} /> Expected End
                  </div>
                  <div style={{ fontSize: 14 }}>{project.expectedEndDate || "Not set"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <DollarSign size={14} /> Budget
                  </div>
                  <div style={{ fontSize: 14 }}>{project.totalAgreedAmount ? `${project.currency || "USD"} ${project.totalAgreedAmount}` : "Not set"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          {milestones.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No milestones yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {milestones.map((ms) => (
                <Card key={ms.id}>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{ms.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {ms.dueDate ? `Due: ${ms.dueDate}` : ""}{ms.description ? ` | ${ms.description.substring(0, 100)}` : ""}
                      </div>
                    </div>
                    <Badge variant={ms.status === "completed" || ms.status === "approved" ? "success" : "secondary"}>{ms.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliverables">
          {deliverables.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No deliverables yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deliverables.map((d) => (
                <Card key={d.id}>
                  <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ flex: 1 }}>
                      <Link href={`/deliverables/${d.id}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                        {d.title}
                      </Link>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {d.submittedAt ? `Submitted: ${new Date(d.submittedAt).toLocaleDateString()}` : "Not submitted"}
                      </div>
                    </div>
                    <Badge variant={d.status === "approved" ? "success" : d.status === "submitted" ? "default" : d.status === "revision_requested" ? "warning" : "secondary"}>
                      {d.status}
                    </Badge>
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
    </div>
  );
}
