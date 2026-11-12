"use client";

import { Input } from "@repo/ui";

/**
 * Tags field for the Project / Case Study edit forms — the same data
 * pattern as posts (`tags` table + a *_tags join, migration 0028). The
 * parent form reads the comma-separated value from FormData ("tags") and
 * saves it with setEntityTags after the main save (the server action
 * creates missing tag rows and replaces the entity's links).
 */

export function ContentTagsField({
  initialTags = [],
}: {
  initialTags?: string[];
}) {
  return (
    <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Tags</h2>
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Tags</label>
        <Input
          name="tags"
          defaultValue={initialTags.join(", ")}
          placeholder="erp, ecommerce, nextjs"
        />
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Comma-separated tags — shown on the detail page and used for search.
        </p>
      </div>
    </div>
  );
}
