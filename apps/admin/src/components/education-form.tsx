"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import { useRouter } from "next/navigation";
import type { EducationEntryRow } from "@/actions/education";

// Create/edit form for one education entry (0039, PR #22). The page
// wrapper supplies onSubmit (the matching create/update server
// action) and onSaved (navigation); the form only collects the
// fields. Every English field has its Bangla field next to it (the
// PR #76 pattern). A NULL end date means ongoing / present.

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

/** "2020-01-01T00:00:00.000Z" (or "2020-01-01") → "2020-01-01" for
 *  <input type="date">. */
function toDateInput(value: unknown): string {
  if (typeof value !== "string" || value === "") return "";
  return value.slice(0, 10);
}

export interface EducationFormProps {
  initial?: EducationEntryRow | null;
  submitLabel: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onSaved: () => void;
}

export function EducationForm({
  initial,
  submitLabel,
  onSubmit,
  onSaved,
}: EducationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      degree: form.get("degree"),
      degreeBn: form.get("degreeBn"),
      institution: form.get("institution"),
      institutionBn: form.get("institutionBn"),
      fieldOfStudy: form.get("fieldOfStudy"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      grade: form.get("grade"),
      description: form.get("description"),
      descriptionBn: form.get("descriptionBn"),
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
          <label style={labelStyle}>Degree / Title</label>
          <Input name="degree" defaultValue={initial?.degree || ""} placeholder="e.g. BSc in Computer Science & Engineering" />
        </div>
        <div>
          <label style={labelStyle}>Degree / Title (Bangla) — বাংলা</label>
          <Input name="degreeBn" defaultValue={initial?.degreeBn || ""} placeholder="বাংলা ডিগ্রি / শিরোনাম (optional — empty shows the English title)" />
        </div>
        <div>
          <label style={labelStyle}>Institution</label>
          <Input name="institution" defaultValue={initial?.institution || ""} placeholder="e.g. University of Dhaka" />
        </div>
        <div>
          <label style={labelStyle}>Institution (Bangla) — বাংলা</label>
          <Input name="institutionBn" defaultValue={initial?.institutionBn || ""} placeholder="বাংলা প্রতিষ্ঠানের নাম (optional — empty shows the English name)" />
        </div>
        <div>
          <label style={labelStyle}>Field of study</label>
          <Input name="fieldOfStudy" defaultValue={initial?.fieldOfStudy || ""} placeholder="e.g. Computer Science (optional)" />
        </div>
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
          <label style={labelStyle}>Grade / GPA / Achievement</label>
          <Input name="grade" defaultValue={initial?.grade || ""} placeholder="e.g. CGPA 3.85 / 4.00 (optional — only shown when set)" />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <Textarea name="description" defaultValue={initial?.description || ""} rows={4} placeholder="A short note about this education (optional)" />
        </div>
        <div>
          <label style={labelStyle}>Description (Bangla) — বাংলা</label>
          <Textarea name="descriptionBn" defaultValue={initial?.descriptionBn || ""} rows={4} placeholder="বাংলা বিবরণ (optional — empty shows the English description)" />
        </div>
        <div>
          <label style={labelStyle}>Sort order</label>
          <Input name="sortOrder" type="number" defaultValue={initial?.sortOrder !== null && initial?.sortOrder !== undefined ? String(initial.sortOrder) : ""} placeholder="0, 1, 2… — lower shows first (within the same start date)" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isVisible" name="isVisible" defaultChecked={initial?.isVisible !== false} />
          <label htmlFor="isVisible" style={{ fontSize: 14, color: "var(--text-primary)" }}>Visible on the Education page — uncheck to hide this entry without deleting it</label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
