/**
 * snake_case -> camelCase normaliser for the dashboard API routes.
 *
 * The artist / entrepreneur repositories run raw SQL (`SELECT *`), so rows
 * come back with the database's snake_case column names
 * (`release_date`, `content_status`, ...). The dashboard UI reads camelCase
 * (`releaseDate`, `contentStatus`, ...). Without this, detail pages render
 * blank fields and saves silently lose values.
 *
 * Conversion is SHALLOW on purpose: only the row's own keys are renamed.
 * Nested jsonb values (release `credits`, lyrics `translations`) keep their
 * keys untouched — the public site reads e.g. `credits.tune_bn` verbatim.
 * Arrays of rows (list responses like `{ releases: [...] }`) have each
 * element converted.
 */

const toCamelKey = (key: string): string =>
  key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

export function toCamelRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamelKey(key)] = value;
  }
  return out as T;
}

export function toCamel<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item !== null && typeof item === "object" && !Array.isArray(item)
        ? toCamelRow(item as Record<string, unknown>)
        : item,
    ) as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[toCamelKey(key)] = Array.isArray(entry)
        ? entry.map((item) =>
            item !== null && typeof item === "object" && !Array.isArray(item)
              ? toCamelRow(item as Record<string, unknown>)
              : item,
          )
        : entry;
    }
    return out as T;
  }
  return value;
}
