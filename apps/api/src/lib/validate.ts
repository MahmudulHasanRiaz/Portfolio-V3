// Shared request-validation helpers for the Hono API (Zod audit, 2026-11-13).
//
// The audit found the same gaps in almost every route file: bare
// `await c.req.json()` (malformed JSON → 500, not 400), no UUID check on
// `:id` path params (malformed id → DB 500), and unclamped pagination
// (`pageSize=1000000` returns an unbounded result set). These helpers are
// the one place that fixes them, so route handlers stay small.
//
// Conventions (match the existing finance.ts pattern):
// - Errors use the uniform `{ error: string }` body with `c.json`.
// - A failed Zod parse returns 400 with the FIRST issue's message
//   (`firstIssue`), exactly as the finance routes already do.
// - `readJsonBody` returns null on malformed/empty JSON; the handler
//   turns that into a 400 (never a 500).
// - `parsePagination` CLAMPS (page >= 1, pageSize 1..max) instead of
//   rejecting, matching the existing search.ts / freelance.ts behaviour.
// - Schemas themselves live in `@repo/validation` (reused) or locally in
//   the route file (finance.ts precedent) — this file holds no schemas.
import type { Context } from "hono";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";

/** First Zod issue message, exactly as the finance routes return it. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

/**
 * Safe JSON body parse: the parsed value, or null when the body is
 * absent, empty, or malformed JSON. Callers turn null into a 400
 * ("Invalid request body") — never let a bare `c.req.json()` throw
 * into the outer catch and surface as a 500.
 */
export async function readJsonBody(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

/** True when v is a plain (non-array, non-null) object. Rejects non-object JSON bodies (`"x"`, `123`, `null`, `[]`). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate a parsed body against a Zod schema. Returns `{ data }` on
 * success or `{ error }` (the first issue's message) on failure; the
 * handler returns `c.json({ error }, 400)` for the failure case.
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodType<T>,
): { data: T } | { error: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  return { data: parsed.data };
}

/**
 * Clamped pagination from query params. page is >= 1 (default 1);
 * pageSize is clamped to 1..maxPageSize (default 20, max 100).
 * Non-numeric values fall back to the defaults. Never throws.
 */
export function parsePagination(
  c: Context,
  opts?: { defaultPageSize?: number; maxPageSize?: number },
): { page: number; pageSize: number } {
  const max = opts?.maxPageSize ?? 100;
  const def = opts?.defaultPageSize ?? 20;
  const rawPage = Number(c.req.query("page"));
  const rawSize = Number(c.req.query("pageSize"));
  const page = Number.isFinite(rawPage)
    ? Math.max(1, Math.floor(rawPage))
    : 1;
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(max, Math.max(1, Math.floor(rawSize)))
    : def;
  return { page, pageSize };
}

/**
 * Validate a path param as a UUID. Returns the value, or null when it
 * is absent or not a UUID. Callers return 400 (`invalidParam`) for null
 * instead of passing a malformed id to the DB (which 500s).
 */
export function uuidParam(c: Context, name: string): string | null {
  const value = c.req.param(name);
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The 400 response for a malformed path param. */
export function invalidParam(c: Context, name: string) {
  return c.json({ error: `Invalid ${name}` }, 400);
}
