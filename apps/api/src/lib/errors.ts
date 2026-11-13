// Shared error helpers for the Hono API.
//
// Current state (audited 2026-11-13): every route handler catches its
// own errors and returns the uniform shape `{ error: string }` via
// `c.json` (790 `c.json` call sites; no `HTTPException` use anywhere,
// no `new Response` / hand-rolled JSON anywhere). That per-handler
// try/catch is the established pattern and is NOT being rewritten here
// — the route files are owned by parallel workers.
//
// What this module provides, for routes to adopt as a follow-up
// (opt-in, no route file changed in this task):
// - `httpError(status, message)` — throw an HTTPException from a
//   handler; the app-level onError in index.ts maps it to the same
//   `{ error }` shape with the thrown status, instead of a blanket 500.
// - `jsonError(c, status, message)` — the one-line form of the
//   `c.json({ error }, status)` return every handler currently writes
//   by hand.
// - `ErrorBody` — the uniform error-body type.
//
// Until routes adopt these, the only live effect is the onError
// branch in index.ts: an uncaught HTTPException now keeps its status
// (today nothing throws one, so no response changes).
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** The uniform error body every API response uses: `{ error: string }`. */
export interface ErrorBody {
  error: string;
}

/**
 * Throw this from a handler to end the request with `status` and the
 * uniform `{ error: message }` body (rendered by onError in index.ts).
 * Prefer it over `throw new Error(...)` for expected failures
 * (400 validation, 401 auth, 404 not-found) so they do not surface
 * as 500s.
 */
export function httpError(
  status: ContentfulStatusCode,
  message: string,
): HTTPException {
  return new HTTPException(status, { message });
}

/** One-line form of `c.json({ error: message }, status)`. */
export function jsonError(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
) {
  return c.json({ error: message }, status);
}
