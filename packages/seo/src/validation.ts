export interface ValidationIssue {
  entityType: string;
  entityId: string;
  field: string;
  severity: "warning" | "error";
  message: string;
}

export interface ValidationReport {
  total: number;
  warnings: number;
  errors: number;
  issues: ValidationIssue[];
}

export function validateEntitySeo(
  entityType: string,
  entityId: string,
  meta: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    keywords?: string | null;
  },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!meta.metaTitle || meta.metaTitle.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "metaTitle",
      severity: "error",
      message: "Missing meta title — search results will show untitled",
    });
  } else if (meta.metaTitle.length > 60) {
    issues.push({
      entityType,
      entityId,
      field: "metaTitle",
      severity: "warning",
      message: `Meta title is ${meta.metaTitle.length} characters (recommended: ≤60)`,
    });
  }

  if (!meta.metaDescription || meta.metaDescription.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "metaDescription",
      severity: "error",
      message: "Missing meta description — search snippets will be auto-generated",
    });
  } else if (meta.metaDescription.length > 160) {
    issues.push({
      entityType,
      entityId,
      field: "metaDescription",
      severity: "warning",
      message: `Meta description is ${meta.metaDescription.length} characters (recommended: ≤160)`,
    });
  }

  if (!meta.ogImage || meta.ogImage.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "ogImage",
      severity: "warning",
      message: "Missing Open Graph image — social shares will lack preview",
    });
  }

  if (!meta.canonicalUrl || meta.canonicalUrl.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "canonicalUrl",
      severity: "warning",
      message: "Missing canonical URL — duplicate content risk",
    });
  }

  return issues;
}

export function validateRedirects(
  redirects: Array<{
    id: string;
    sourceSlug: string;
    destinationUrl: string;
    isActive: boolean;
  }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceMap = new Map<string, string>();

  const seen = new Map<string, string[]>();
  for (const r of redirects) {
    if (!r.isActive) continue;
    const existing = seen.get(r.sourceSlug) || [];
    existing.push(r.id);
    seen.set(r.sourceSlug, existing);
  }

  for (const [source, ids] of seen) {
    if (ids.length > 1) {
      issues.push({
        entityType: "redirect",
        entityId: ids.join(","),
        field: "sourceSlug",
        severity: "error",
        message: `Duplicate redirect source: "${source}" has ${ids.length} active redirects`,
      });
    }
  }

  for (const r of redirects) {
    if (!r.isActive) continue;
    sourceMap.set(r.sourceSlug, r.destinationUrl);
  }

  for (const r of redirects) {
    if (!r.isActive) continue;
    let current = r.destinationUrl;
    const visited = new Set<string>();
    visited.add(r.sourceSlug);

    while (current) {
      const parsed = new URL(current, "http://localhost");
      const sourceKey = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (visited.has(sourceKey)) {
        issues.push({
          entityType: "redirect",
          entityId: r.id,
          field: "destinationUrl",
          severity: "error",
          message: `Circular redirect detected: "${r.sourceSlug}" → "${r.destinationUrl}" creates a loop`,
        });
        break;
      }
      if (sourceMap.has(sourceKey)) {
        visited.add(sourceKey);
        current = sourceMap.get(sourceKey)!;
      } else {
        break;
      }
    }
  }

  return issues;
}

export function generateValidationReport(
  entities: Array<{
    entityType: string;
    entityId: string;
    meta: {
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogImage?: string | null;
      canonicalUrl?: string | null;
      keywords?: string | null;
    };
  }>,
  redirects?: Array<{
    id: string;
    sourceSlug: string;
    destinationUrl: string;
    isActive: boolean;
  }>,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  for (const entity of entities) {
    issues.push(...validateEntitySeo(entity.entityType, entity.entityId, entity.meta));
  }

  if (redirects) {
    issues.push(...validateRedirects(redirects));
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return {
    total: issues.length,
    warnings,
    errors,
    issues,
  };
}
