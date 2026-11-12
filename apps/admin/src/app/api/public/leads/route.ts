// Public Leads API — POST /api/public/leads
// The Astro public site's contact form posts here. The admin
// POST /api/leads requires a Better Auth session (401 without one),
// which a public visitor never has — so this public endpoint exists
// instead, guarded the same way as the rest of the Public Content API:
// an integration Bearer token (isAuthorized — the Astro server route
// calls with the Worker secret). No admin session required.
//
// Validation follows the shared contract in the Astro site's
// src/lib/lead.ts EXACTLY (same rules, same messages): name required;
// email OR phone required; email shape; Bangladeshi mobile
// (01XXXXXXXXX or +8801XXXXXXXXX). service / message optional.
//
// Rate limit: max 10 submissions per hour per IP, in-memory (best
// effort, per server instance — the dashboard runs a single instance;
// a distributed limiter is out of scope for a contact form). 429 when
// exceeded. Successful inserts return 201 + { id }.
//
// The token is never logged; neither is the submitted body.
import { NextResponse, type NextRequest } from "next/server";
import { getDb, leads } from "@repo/database";
import { isAuthorized } from "@/lib/public-content";

export const dynamic = "force-dynamic";

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

// --- Rate limit (10/hour per IP, in-memory) -------------------------
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

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function asField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isRateLimited(clientIp(request))) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { errors: [{ field: "name", message: "Please tell me your name." }] },
        { status: 400 },
      );
    }
    const input =
      body !== null && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};
    // Over-long contact values cannot be stored (email varchar(255),
    // phone varchar(50)) — treat them as invalid, same field message.
    const name = asField(input.name);
    const emailRaw = asField(input.email);
    const phoneRaw = asField(input.phone);
    const email = emailRaw.length > 255 ? "invalid" : emailRaw;
    const phone = phoneRaw.length > 50 ? "invalid" : phoneRaw;
    const errors = validateLead({ name, email, phone });
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }
    const db = getDb();
    const [inserted] = await db
      .insert(leads)
      .values({
        fullName: name,
        email: email || null,
        phone: phone || null,
        projectType: asField(input.service) || null,
        message: asField(input.message) || null,
        leadSource: "website",
      })
      .returning({ id: leads.id });
    return NextResponse.json({ id: inserted?.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit. Please try again later." },
      { status: 500 },
    );
  }
}
