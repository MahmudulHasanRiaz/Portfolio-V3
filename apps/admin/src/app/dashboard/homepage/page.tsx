"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";
import { Eye, EyeOff, ArrowUp, ArrowDown, Save, History, RotateCcw } from "lucide-react";
import SectionEditor from "./components/section-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Section { id: string; sectionKey: string; isVisible: boolean; sortOrder: number | null; content: Record<string, unknown> | null; createdAt: string; updatedAt: string; }
interface Version { id: string; version: number; snapshotJson: Record<string, unknown>; createdBy: string | null; createdAt: string; }
interface SeedReport { sections: { inserted: string[]; skipped: string[] }; services: { inserted: string[]; skipped: string[] }; projects: { inserted: string[]; skipped: string[] }; technologies: { inserted: string[]; skipped: string[] }; projectLinks: { inserted: number }; releases: { inserted: string[]; skipped: string[] }; releasePlatforms: { inserted: number }; ventures?: { inserted: string[]; skipped: string[] }; caseStudies?: { inserted: string[]; skipped: string[] }; posts?: { inserted: string[]; skipped: string[] }; profile: string; }

function versionSectionCount(v: Version): number {
  const sections = (v.snapshotJson as { sections?: unknown[] } | null)?.sections;
  return Array.isArray(sections) ? sections.length : 0;
}

export default function HomepagePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [seedReport, setSeedReport] = useState<SeedReport | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Version | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/homepage/sections");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setSections(data.sections || []);
      setVersions(data.versions || []);
      setLoadError("");
    } catch {
      setLoadError("Could not load homepage sections — please reload the page.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) {
    setError("");
    const res = await fetch(`/api/homepage/sections/${id}/toggle`, { method: "POST" });
    if (!res.ok) {
      setError("Could not change visibility — please try again.");
      return;
    }
    await load();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setError("");
    const ids: string[] = sections.map((s) => s.id);
    const temp = ids[index] as string;
    ids[index] = ids[target] as string;
    ids[target] = temp;
    const res = await fetch("/api/homepage/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    if (!res.ok) {
      setError("Could not reorder sections — please try again.");
      return;
    }
    await load();
  }

  async function handleSaveVersion() {
    setError("");
    setNotice("");
    setSavingVersion(true);
    try {
      const res = await fetch("/api/homepage/versions", { method: "POST" });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setNotice(`Version ${data.version?.version ?? ""} saved.`.trim());
      await load();
    } catch {
      setError("Could not save a version — please try again.");
    }
    setSavingVersion(false);
  }

  async function handleRestoreVersion() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/homepage/versions/${restoreTarget.id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("restore failed");
      const data = await res.json();
      setNotice(`Version ${restoreTarget.version} restored (${data.restored ?? 0} sections).`);
      setRestoreTarget(null);
      setShowVersions(false);
      await load();
    } catch {
      setError("Could not restore that version — please try again.");
      setRestoreTarget(null);
    }
    setRestoring(false);
  }

  async function handleSeed() {
    setError("");
    setSeeding(true);
    try {
      const res = await fetch("/api/homepage/seed", { method: "POST" });
      if (!res.ok) throw new Error("seed failed");
      const data = await res.json();
      setSeedReport(data.report);
      await load();
    } catch {
      setError("Seeding failed — please try again.");
    }
    setSeeding(false);
  }

  if (loading) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Homepage Sections</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>Manage and reorder homepage sections</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="outline" onClick={handleSeed} disabled={seeding}>{seeding ? "Seeding..." : "Seed homepage content"}</Button>
          <Button variant="outline" onClick={() => setShowVersions(true)}><History size={16} style={{ marginRight: 6 }} />Versions</Button>
          <Button onClick={handleSaveVersion} disabled={savingVersion}><Save size={16} style={{ marginRight: 6 }} />{savingVersion ? "Saving..." : "Save Version"}</Button>
        </div>
      </div>

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

      {seedReport && (
        <Card>
          <CardContent style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Seed report</div>
            <div>Sections — added: {seedReport.sections.inserted.join(", ") || "none"}; already there: {seedReport.sections.skipped.join(", ") || "none"}</div>
            <div>Services — added: {seedReport.services.inserted.join(", ") || "none"}; already there: {seedReport.services.skipped.join(", ") || "none"}</div>
            <div>Projects — added: {seedReport.projects.inserted.join(", ") || "none"}; already there: {seedReport.projects.skipped.join(", ") || "none"}</div>
            <div>Technologies — added: {seedReport.technologies.inserted.join(", ") || "none"}; already there: {seedReport.technologies.skipped.join(", ") || "none"}; project links added: {seedReport.projectLinks.inserted}</div>
            {seedReport.releases && (
              <div>Releases — added: {seedReport.releases.inserted.join(", ") || "none"}; already there: {seedReport.releases.skipped.join(", ") || "none"}; platform links added: {seedReport.releasePlatforms?.inserted ?? 0}</div>
            )}
            {seedReport.ventures && (
              <div>Ventures — added: {seedReport.ventures.inserted.join(", ") || "none"}; already there: {seedReport.ventures.skipped.join(", ") || "none"}</div>
            )}
            {seedReport.caseStudies && (
              <div>Case Studies — added: {seedReport.caseStudies.inserted.join(", ") || "none"}; already there: {seedReport.caseStudies.skipped.join(", ") || "none"}</div>
            )}
            {seedReport.posts && (
              <div>Posts — added: {seedReport.posts.inserted.join(", ") || "none"}; already there: {seedReport.posts.skipped.join(", ") || "none"}</div>
            )}
            <div>Profile: {seedReport.profile}</div>
            <div style={{ color: "var(--text-muted)", marginTop: 4 }}>Nothing already present was overwritten — run again any time, it only adds what is missing.</div>
          </CardContent>
        </Card>
      )}

      {sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <div>No homepage sections configured</div>
          <div style={{ marginTop: 12 }}><Button onClick={handleSeed} disabled={seeding}>{seeding ? "Seeding..." : "Seed homepage content"}</Button></div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sections.map((section, index) => (
            <Card key={section.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{section.sectionKey}</span>
                    <Badge variant={section.isVisible ? "default" : "outline"}>
                      {section.isVisible ? "visible" : "hidden"}
                    </Badge>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Order: {section.sortOrder}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button variant="outline" size="sm" onClick={() => setEditing(section)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(section.id)} aria-label={section.isVisible ? `Hide ${section.sectionKey}` : `Show ${section.sectionKey}`}>
                    {section.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  {index > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleMove(index, -1)} aria-label={`Move ${section.sectionKey} up`}><ArrowUp size={14} /></Button>
                  )}
                  {index < sections.length - 1 && (
                    <Button variant="outline" size="sm" onClick={() => handleMove(index, 1)} aria-label={`Move ${section.sectionKey} down`}><ArrowDown size={14} /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SectionEditor section={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}

      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent>
          <DialogHeader><DialogTitle>Homepage Versions</DialogTitle></DialogHeader>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Restoring a version replaces the current sections with that snapshot. The latest 5 versions are shown.
          </p>
          {versions.length === 0 ? (
            <div style={{ color: "var(--text-muted)", padding: 24, textAlign: "center" }}>No versions saved yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {versions.map((v) => (
                <Card key={v.id}>
                  <CardContent style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Version {v.version}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {versionSectionCount(v)} sections · {new Date(v.createdAt).toLocaleString()}
                      {v.createdBy ? ` · by ${v.createdBy.slice(0, 8)}` : ""}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setRestoreTarget(v)}>
                      <RotateCcw size={14} style={{ marginRight: 4 }} />Restore
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
        title={`Restore version ${restoreTarget?.version ?? ""}?`}
        message="The current homepage sections will be replaced with this version's snapshot. Sections deleted since the snapshot was taken are not restored."
        confirmLabel="Restore version"
        variant="neutral"
        busy={restoring}
        busyLabel="Restoring..."
        onConfirm={handleRestoreVersion}
      />
    </div>
  );
}
