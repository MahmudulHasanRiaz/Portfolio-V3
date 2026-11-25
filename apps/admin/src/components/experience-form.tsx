"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { useRouter } from "next/navigation";
import type { ExperienceEntryRow } from "@/actions/experience";

// Create/edit form for one experience entry (0041, PR #35). The page
// wrapper supplies onSubmit (the matching create/update server
// action) and onSaved (navigation); the form only collects the
// fields. Every English field has its Bangla field next to it (the
// PR #76 pattern). Two kinds of entries: type 'role' (a job at an
// organisation — title = the role, organisation = the employer) and
// type 'project' (a project-basis engagement — title = the project
// name, organisation = the client, projectSlug links the card to the
// live project detail page). A NULL end date means ongoing / present.

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

/** "2020-01-01T00:00:00.000Z" (or "2020-01-01") → "2020-01-01" for
 *  <input type="date">. */
function toDateInput(value: unknown): string {
  if (typeof value !== "string" || value === "") return "";
  return value.slice(0, 10);
}

export interface ExperienceFormProps {
  initial?: ExperienceEntryRow | null;
  submitLabel: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onSaved: () => void;
}

export function ExperienceForm({
  initial,
  submitLabel,
  onSubmit,
  onSaved,
}: ExperienceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entryType, setEntryType] = useState<string>(
    initial?.type === "project" ? "project" : "role",
  );
  const isProject = entryType === "project";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const sortOrderRaw = String(form.get("sortOrder") || "").trim();
    const sortOrder = sortOrderRaw === "" ? null : parseInt(sortOrderRaw, 10);
    if (sortOrderRaw !== "" && !Number.isFinite(sortOrder)) {
      setError("Sort order must be a number");
      setLoading(false);
      return;
    }
    const data: Record<string, unknown> = {
      type: entryType,
      title: form.get("title"),
      titleBn: form.get("titleBn"),
      organisation: form.get("organisation"),
      organisationBn: form.get("organisationBn"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      description: form.get("description"),
      descriptionBn: form.get("descriptionBn"),
      projectSlug: isProject ? form.get("projectSlug") : null,
      role: isProject ? form.get("role") : null,
      roleBn: isProject ? form.get("roleBn") : null,
      sortOrder,
      isVisible: form.get("isVisible") === "on",
    };
    try {
      await onSubmit(data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Entry type</label>
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="role">Role — a job at an organisation</SelectItem>
              <SelectItem value="project">Project — a project-basis engagement for a client</SelectItem>
            </SelectContent>
          </Select>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {isProject
              ? "Project entries are the hero of the Experience page — project-basis work is his main mode."
              : "Role entries are the milestones — jobs held at an organisation."}
          </p>
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Project name" : "Role / Title"}</label>
          <Input name="title" defaultValue={initial?.title || ""} placeholder={isProject ? "e.g. Jannat Fashion ERP" : "e.g. Senior Software Engineer"} />
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Project name (Bangla) — বাংলা" : "Role / Title (Bangla) — বাংলা"}</label>
          <Input name="titleBn" defaultValue={initial?.titleBn || ""} placeholder="বাংলা নাম (optional — empty shows the English title)" />
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Client" : "Organisation"}</label>
          <Input name="organisation" defaultValue={initial?.organisation || ""} placeholder={isProject ? "e.g. Jannat Fashion" : "e.g. Commercians"} />
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Client (Bangla) — বাংলা" : "Organisation (Bangla) — বাংলা"}</label>
          <Input name="organisationBn" defaultValue={initial?.organisationBn || ""} placeholder="বাংলা নাম (optional — empty shows the English name)" />
        </div>
        {isProject && (
          <div>
            <label style={labelStyle}>Project slug</label>
            <Input name="projectSlug" defaultValue={initial?.projectSlug || ""} placeholder="e.g. jannat-fashion-erp" />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              The card links to /projects/&lt;slug&gt; — use the slug of the live project. Leave empty for no link.
            </p>
          </div>
        )}
        {isProject && (
          <div>
            <label style={labelStyle}>Your role on this project</label>
            <Input name="role" defaultValue={initial?.role || ""} placeholder="e.g. Lead Developer & Architect" />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Shown on the project card, under the project name. Leave empty for no role line.
            </p>
          </div>
        )}
        {isProject && (
          <div>
            <label style={labelStyle}>Your role on this project (Bangla) — বাংলা</label>
            <Input name="roleBn" defaultValue={initial?.roleBn || ""} placeholder="বাংলায় ভূমিকা (optional — empty shows the English role)" />
          </div>
        )}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>Start date</label>
            <Input name="startDate" type="date" defaultValue={toDateInput(initial?.startDate)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>End date</label>
            <Input name="endDate" type="date" defaultValue={toDateInput(initial?.endDate)} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Leave empty if ongoing — the page shows “Present”.
            </p>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Outcome" : "Description"}</label>
          <Textarea name="description" defaultValue={initial?.description || ""} rows={4} placeholder={isProject ? "What the engagement delivered (optional)" : "A short note about this role (optional)"} />
        </div>
        <div>
          <label style={labelStyle}>{isProject ? "Outcome (Bangla) — বাংলা" : "Description (Bangla) — বাংলা"}</label>
          <Textarea name="descriptionBn" defaultValue={initial?.descriptionBn || ""} rows={4} placeholder="বাংলা বিবরণ (optional — empty shows the English description)" />
        </div>
        <div>
          <label style={labelStyle}>Sort order</label>
          <Input name="sortOrder" type="number" defaultValue={initial?.sortOrder !== null && initial?.sortOrder !== undefined ? String(initial.sortOrder) : ""} placeholder="0, 1, 2… — lower shows first (within the same start date)" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isVisible" name="isVisible" defaultChecked={initial?.isVisible !== false} />
          <label htmlFor="isVisible" style={{ fontSize: 14, color: "var(--text-primary)" }}>Visible on the Experience page — uncheck to hide this entry without deleting it</label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
