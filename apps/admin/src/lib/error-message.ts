/**
 * Coerce any thrown value into a safe, renderable error string.
 *
 * React error #441 ("Objects are not valid as a React child") fires when
 * an error OBJECT is rendered as a child. Server-action / Hono errors are
 * usually `Error` instances with a string message, but a deserialized
 * error, a Zod-style issue object, or a plain `{ error: {...} }` body can
 * arrive as a non-Error value — or as an Error whose `message` is itself
 * an object. Every branch below returns a plain string, so a failure can
 * never crash the page with #441; the worst case is a readable JSON
 * snippet instead of a blank "Failed".
 */
export function toErrorMessage(err: unknown, fallback = "Failed"): string {
  if (typeof err === "string" && err.trim() !== "") return err;
  if (err instanceof Error) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim() !== "") return m;
    if (m !== undefined && m !== null) return stringify(m);
    return err.name ? `${err.name}: ${fallback}` : fallback;
  }
  if (err !== null && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim() !== "") {
      return rec.message;
    }
    if (rec.message !== undefined && rec.message !== null) {
      return stringify(rec.message);
    }
    // Zod-style: { issues: [{ message }] } / { error: ... }
    if (Array.isArray(rec.issues) && rec.issues.length > 0) {
      const first = (rec.issues[0] as Record<string, unknown>)?.message;
      if (typeof first === "string" && first.trim() !== "") return first;
    }
    if (typeof rec.error === "string" && rec.error.trim() !== "") {
      return rec.error;
    }
    return stringify(rec);
  }
  if (err !== undefined && err !== null) return String(err);
  return fallback;
}

function stringify(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s && s.length > 0 ? (s.length > 300 ? `${s.slice(0, 300)}…` : s) : "Failed";
  } catch {
    return "Failed";
  }
}
