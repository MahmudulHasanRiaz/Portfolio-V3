// Shared helpers for the finance admin routes (split from
// routes/admin/finance.ts — moved verbatim, behavior unchanged).
// Used by 2+ of the finance sub-routers: error helpers, tableFields,
// money / currency conversion, workflow dispatch, and the Zod schemas
// shared across sub-files, plus the Env type.
import { type Context } from "hono";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { workflowRuns, workflows } from "@repo/database/schema";
import { type ApiDb } from "../../../db";

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    R2_ENDPOINT?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_PUBLIC_URL?: string;
  };
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** An error that maps to a non-500 HTTP status (mirrors FinanceError's
 *  code -> status mapping in the Next.js routes: *_NOT_FOUND -> 404,
 *  other finance errors -> 400). */
export function fail(status: 400 | 404, message: string): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}


export function errorResponse(
  c: Context<Env>,
  err: unknown,
  fallback: string,
  duplicateMessage?: string,
): Response {
  if (err instanceof Error) {
    const status = (err as Error & { status?: unknown }).status;
    if (status === 400) return c.json({ error: err.message }, 400);
    if (status === 404) return c.json({ error: err.message }, 404);
    // `slug` is unique: surface a readable message instead of the raw
    // Postgres "duplicate key value violates unique constraint" text.
    if (duplicateMessage && /duplicate key value/i.test(err.message)) {
      return c.json({ error: duplicateMessage }, 409);
    }
  }
  return c.json({ error: errorMessage(err, fallback) }, 500);
}


/** True when the value parses as a date (query date validation). */
export function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}


/**
 * Map a request body to table insert/update values. Mirrors the finance
 * repositories' dynamic column handling: only known columns, `id` /
 * `createdAt` / `createdBy` never taken from the body, unknown keys
 * dropped. With skipNulls (create) null values are dropped so DB defaults
 * apply; without it (update) nulls are set, as in the repositories.
 */
export function tableFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (
      key === "id" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "createdBy"
    ) {
      continue;
    }
    if (!(key in columns)) continue;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}


/** packages/finance/src/currency.ts — pure, no Node dependency. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


export function resolveBdtConversion(
  currencyInput: string | null | undefined,
  amount: string | number | null | undefined,
  exchangeRateInput: string | number | null | undefined,
): { currency: string; exchangeRate: number; amountBdt: number } {
  const currency = (currencyInput ?? "BDT").toUpperCase();
  const value = Number(amount ?? 0);
  if (currency === "BDT") {
    return { currency, exchangeRate: 1, amountBdt: round2(value) };
  }
  const rate =
    exchangeRateInput === null ||
    exchangeRateInput === undefined ||
    exchangeRateInput === ""
      ? NaN
      : Number(exchangeRateInput);
  if (!rate || Number.isNaN(rate)) {
    throw fail(
      400,
      `Exchange rate is required for ${currency} transactions (base currency is BDT)`,
    );
  }
  return { currency, exchangeRate: rate, amountBdt: round2(value * rate) };
}


// ─── Workflow dispatch (TriggerRegistry.dispatch port) ───────────────────────
// @repo/workflows dispatchTrigger is NOT Workers-safe (postgres.js pool)
// and routes/admin/workflows/index.ts does not re-export its Drizzle port of the
// same function, so the two queries are repeated here: find the active
// workflows listening for the trigger, then record one pending
// workflow_runs row per match. Dispatch only records runs — execution
// happens via POST /workflows/process or the cron tick. Callers wrap
// this in try/catch so a workflow failure never fails the API call.
// The payload is JSON round-tripped first so Drizzle row values that
// are not plain JSON (Date objects, numeric strings stay strings) are
// stored exactly as the jsonb column would hold them.
export async function dispatchWorkflowTrigger(
  db: ApiDb,
  triggerType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const matched = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.triggerType, triggerType),
        eq(workflows.isActive, true),
      ),
    )
    .orderBy(asc(workflows.createdAt));
  const cleanPayload = JSON.parse(JSON.stringify(payload)) as Record<
    string,
    unknown
  >;
  for (const workflow of matched) {
    await db.insert(workflowRuns).values({
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      triggerType,
      triggerEntityId: entityId,
      triggerPayload: cleanPayload,
      status: "pending",
    });
  }
}


// ─── Validation ──────────────────────────────────────────────────────────────
// Local copies of the @repo/validation finance.ts schemas (apps/api does
// not depend on @repo/validation). Create schemas omit `createdBy` — it is
// stamped from the session, never taken from the body.
// Only the schemas used by 2+ sub-routers live here; single-use schemas
// stay in their sub-file.

export const uuidSchema = z.string().uuid();

export const timestampSchema = z.string().datetime();

export const expenseSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
  "general",
]);

export const paymentSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
]);


/** First Zod issue message, exactly as the Next.js routes return it. */
export function invalidBody(parsed: { error: z.ZodError }): string {
  return parsed.error.issues[0]?.message ?? "Invalid request body";
}

