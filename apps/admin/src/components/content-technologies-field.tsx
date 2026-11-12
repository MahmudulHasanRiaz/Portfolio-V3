"use client";

/**
 * Technologies field for the Project new / edit forms — a multi-picker
 * over the existing `technologies` taxonomy (managed at Dashboard →
 * Technologies). The parent form reads the checked values from FormData
 * ("technologies", one entry per checked box) and saves them with
 * setEntityTechnologies after the main save (the server action replaces
 * the entity's `project_technologies` links wholesale).
 */

export interface TechnologyOption {
  id: string;
  name: string;
}

export function ContentTechnologiesField({
  technologies = [],
  initialTechnologyIds = [],
}: {
  technologies?: TechnologyOption[];
  initialTechnologyIds?: string[];
}) {
  const selected = new Set(initialTechnologyIds);
  return (
    <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Technologies</h2>
      {technologies.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          No technologies yet — add them at Dashboard → Technologies first.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {technologies.map((tech) => (
            <label
              key={tech.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="technologies"
                value={tech.id}
                defaultChecked={selected.has(tech.id)}
              />
              {tech.name}
            </label>
          ))}
        </div>
      )}
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
        Shown on the project detail page and used by the public API — the
        project year is derived from its start date.
      </p>
    </div>
  );
}
