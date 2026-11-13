// Public Content API — Hono port of the Next.js admin routes:
//   GET /api/public/content/:type
//   GET /api/public/content/:type/:slug
//   GET /api/public/settings
// Response shapes mirror the Next.js routes exactly (the Astro live
// loader accepts either a bare array or { items } for lists, and either
// the bare item or { item } for a single item).
// Auth: the same dual-token model as the admin (see lib/public-content
// isAuthorized) — env PUBLIC_CONTENT_API_TOKEN, or a per-integration
// Bearer token. NO Better Auth on these routes.
import { Hono } from "hono";
import { z } from "zod";
import { leads } from "@repo/database/schema";
import { getApiDb } from "../db";
import { isRecord, readJsonBody } from "../lib/validate";
import {
  getPublicContent,
  getPublicSettings,
  isAuthorized,
  isPublicContentType,
  listPublicContent,
} from "../lib/public-content";

type Env = {
  Bindings: {
    PUBLIC_CONTENT_API_TOKEN?: string;
    DATABASE_URL?: string;
  };
};

const app = new Hono<Env>();

function waitUntilOf(c: {
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
}): ((promise: Promise<unknown>) => void) | undefined {
  const w = c.executionCtx?.waitUntil;
  return w ? w.bind(c.executionCtx) : undefined;
}

app.get("/content/:type", async (c) => {
  try {
    const type = c.req.param("type");
    if (!isPublicContentType(type)) {
      return c.json({ error: "Unknown content type" }, 404);
    }
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    const items = await listPublicContent(type);
    // Ya Nabi rule (LIST ONLY): "Ya Nabi Salam Alaika" must NEVER be
    // shown separately (no spotlight / featured / homepage). It may exist
    // as an ordinary row in the full releases list + an ordinary detail
    // page, but the live loader merges this list into the homepage, so it
    // is excluded here to keep it off the homepage. The single-item
    // endpoint must still return it — do NOT move this filter into
    // listPublicContent / getPublicContent.
    const visible =
      type === "releases"
        ? items.filter((item) => item.slug !== "ya-nabi-salam-alaika")
        : items;
    return c.json({ items: visible });
  } catch {
    return c.json({ error: "Failed to load public content" }, 500);
  }
});

app.get("/content/:type/:slug", async (c) => {
  try {
    const type = c.req.param("type");
    const slug = c.req.param("slug");
    if (!isPublicContentType(type)) {
      return c.json({ error: "Unknown content type" }, 404);
    }
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    let decodedSlug: string;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {
      return c.json({ error: "Invalid slug" }, 400);
    }
    const item = await getPublicContent(type, decodedSlug);
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json(item);
  } catch {
    return c.json({ error: "Failed to load public content" }, 500);
  }
});

app.get("/settings", async (c) => {
  try {
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    const settings = await getPublicSettings();
    return c.json(settings);
  } catch {
    return c.json({ error: "Failed to load public settings" }, 500);
  }
});

// ─── Public leads ────────────────────────────────────────────────────────────
// POST /leads — Hono port of apps/admin/src/app/api/public/leads/route.ts.
// The Astro public site's contact form posts here. The admin POST
// /api/leads requires a Better Auth session (401 without one), which a
// public visitor never has — so this public endpoint exists instead,
// guarded the same way as the rest of the Public Content API: an
// integration Bearer token (isAuthorized). NO Better Auth session is
// required on this route — do not add requireAuth here.
// Validation follows the shared contract in the Astro site's
// src/lib/lead.ts EXACTLY (same rules, same messages): name required;
// email OR phone required; email shape; Bangladeshi mobile
// (01XXXXXXXXX or +8801XXXXXXXXX). service / message optional.
// Successful inserts return 201 + { id }. The token is never logged;
// neither is the submitted body.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 01XXXXXXXXX (11 digits, starts 01) or +8801XXXXXXXXX — same as lead.ts.
const BD_PHONE_RE = /^(?:\+8801\d{9}|01\d{9})$/;

interface LeadError {
  field: "name" | "contact" | "email" | "phone";
  message: string;
}

/** Mirrors validateLead() in the Astro site's src/lib/lead.ts — the
 * error strings are the contract, keep them identical. */
function validateLead(input: {
  name: string;
  email: string;
  phone: string;
}): LeadError[] {
  const errors: LeadError[] = [];
  const { name, email, phone } = input;
  if (!name) {
    errors.push({ field: "name", message: "Please tell me your name." });
  }
  if (!email && !phone) {
    errors.push({
      field: "contact",
      message: "Please give your email or phone number so I can reply.",
    });
  }
  if (email && !EMAIL_RE.test(email)) {
    errors.push({
      field: "email",
      message: "That email address does not look right.",
    });
  }
  if (phone && !BD_PHONE_RE.test(phone.replace(/[\s-]/g, ""))) {
    errors.push({
      field: "phone",
      message:
        "Please give a Bangladeshi mobile number — 01XXXXXXXXX or +8801XXXXXXXXX.",
    });
  }
  return errors;
}

// POST /leads body validation (local schema — no shared public-lead
// schema exists). Mirrors validateLead() below: name required, email
// OR phone required, BD-mobile shape for phone. The refine paths let
// Zod failures map back onto the { errors: [{ field, message }] }
// contract this endpoint has always returned (see the handler).
const publicLeadSchema = z
  .object({
    name: z.string().min(1).max(255),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    service: z.string().max(255).optional(),
    message: z.string().max(2000).optional(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    path: ["contact"],
    message: "Please give your email or phone number so I can reply.",
  })
  .refine((d) => !d.phone || BD_PHONE_RE.test(d.phone.replace(/[\s-]/g, "")), {
    path: ["phone"],
    message:
      "Please give a Bangladeshi mobile number — 01XXXXXXXXX or +8801XXXXXXXXX.",
  });

// --- Rate limit (10/hour per IP, in-memory) -------------------------
// TODO (cutover): this Map is per-instance — on Workers each isolate
// keeps its own count, so the limit is best-effort only under
// multi-instance deployment. A shared limiter (KV / Durable Object)
// is a cutover concern; single-instance behaviour matches the
// original exactly.
const MAX_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;
const hitsByIp = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hitsByIp.get(ip);
  if (!entry || now >= entry.resetAt) {
    hitsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_PER_HOUR) return true;
  entry.count += 1;
  return false;
}

function clientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return c.req.header("x-real-ip")?.trim() || "unknown";
}

function asField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

app.post("/leads", async (c) => {
  try {
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    if (isRateLimited(clientIp(c))) {
      return c.json(
        { error: "Too many requests. Please try again later." },
        429,
      );
    }
    const body = await readJsonBody(c);
    if (body === null) {
      return c.json(
        { errors: [{ field: "name", message: "Please tell me your name." }] },
        400,
      );
    }
    const input = isRecord(body) ? body : {};
    // Over-long contact values cannot be stored (email varchar(255),
    // phone varchar(50)) — treat them as invalid, same field message.
    const name = asField(input.name);
    const emailRaw = asField(input.email);
    const phoneRaw = asField(input.phone);
    const email = emailRaw.length > 255 ? "invalid" : emailRaw;
    const phone = phoneRaw.length > 50 ? "invalid" : phoneRaw;
    // Zod check on the extracted (trimmed) values: length caps for
    // name/service/message, email shape, BD-mobile phone, email-or-phone.
    // Failures map onto the same { errors: [{ field, message }] } shape.
    const parsed = publicLeadSchema.safeParse({
      name,
      email: email || undefined,
      phone: phone || undefined,
      service: asField(input.service) || undefined,
      message: asField(input.message) || undefined,
    });
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: (issue.path[0] as string | undefined) ?? "name",
        message: issue.message,
      }));
      return c.json({ errors }, 400);
    }
    const errors = validateLead({ name, email, phone });
    if (errors.length > 0) {
      return c.json({ errors }, 400);
    }
    const db = getApiDb();
    const [inserted] = await db
      .insert(leads)
      .values({
        fullName: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        projectType: parsed.data.service || null,
        message: parsed.data.message || null,
        leadSource: "website",
      })
      .returning({ id: leads.id });
    return c.json({ id: inserted?.id }, 201);
  } catch {
    return c.json(
      { error: "Failed to submit. Please try again later." },
      500,
    );
  }
});

export default app;
