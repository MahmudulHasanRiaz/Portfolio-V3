// Admin analytics track beacon — moved verbatim from
// routes/admin/analytics.ts (split into routes/admin/analytics/).
//
// Mounted at /api/admin/analytics (see routes/admin/index.ts).
//
// POST /track is a PUBLIC beacon by design (no auth), exactly as in
// the original. It also preserves the original's lookup quirk:
// getActiveSession(visitorId) ignores the client-supplied sessionId
// and returns any active session for the visitor; a new session is
// started only when no active session exists.
// Neon HTTP does not support db.transaction(): the beacon's
// identify → session → page-view steps run as sequential statements,
// as in the original (which also used no transaction).
import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  pageViews,
  visitors,
  visitorSessions,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { createRateLimiter } from "../../../lib/rate-limit";
import {
  isRecord,
  readJsonBody,
  validateBody,
} from "../../../lib/validate";
import type { Db, Env } from "./helpers";

const app = new Hono<Env>();

// POST /track body validation (local schema — no shared analytics
// schema exists). sessionId is a visitor_sessions uuid; the route
// still ignores its value for the lookup (see the preserved quirk in
// the handler) but it must be a well-formed uuid when supplied.
const trackEventSchema = z.object({
  anonymousId: z.string().min(1).max(255),
  path: z.string().min(1).max(2048),
  title: z.string().max(500).optional(),
  referrer: z.string().max(2048).optional(),
  userAgent: z.string().max(500).optional(),
  sessionId: z.string().uuid().optional(),
});

// ─── Track beacon services, re-implemented on the Neon HTTP db ──────────────
// (packages/analytics/src/visitor-service.ts, session-service.ts,
// page-view-service.ts — logic verbatim; utm-service.ts extractUTMParams
// is pure and copied verbatim below.)

interface UTMParams {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}

function extractUTMParams(url: string | URL | URLSearchParams): UTMParams {
  const params =
    url instanceof URLSearchParams
      ? url
      : new URL(url instanceof URL ? url : url, "http://localhost").searchParams;

  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  return {
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    utmContent: utmContent || null,
    utmTerm: utmTerm || null,
  };
}

async function identifyVisitor(
  db: Db,
  data: {
    anonymousId: string;
    userAgent?: string | null;
    referrer?: string | null;
  },
) {
  const existing = await db
    .select()
    .from(visitors)
    .where(eq(visitors.anonymousId, data.anonymousId))
    .limit(1);

  if (existing.length > 0) {
    const visitor = existing[0]!;
    const [updated] = await db
      .update(visitors)
      .set({
        lastVisit: new Date(),
        visitCount: sql`${visitors.visitCount} + 1`,
        userAgent: data.userAgent ?? visitor.userAgent,
        referrer: data.referrer ?? visitor.referrer,
      })
      .where(eq(visitors.id, visitor.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(visitors)
    .values({
      anonymousId: data.anonymousId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      visitCount: 1,
    })
    .returning();
  return created!;
}

async function getActiveSession(db: Db, visitorId: string) {
  const [session] = await db
    .select()
    .from(visitorSessions)
    .where(
      and(
        eq(visitorSessions.visitorId, visitorId),
        eq(visitorSessions.isActive, true),
      ),
    )
    .limit(1);
  return session || null;
}

async function startSession(
  db: Db,
  data: {
    visitorId: string;
    landingPage?: string | null;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  },
) {
  await db
    .update(visitorSessions)
    .set({ isActive: false, endTime: new Date() })
    .where(
      and(
        eq(visitorSessions.visitorId, data.visitorId),
        eq(visitorSessions.isActive, true),
      ),
    );

  const [session] = await db
    .insert(visitorSessions)
    .values({
      visitorId: data.visitorId,
      landingPage: data.landingPage,
      referrer: data.referrer,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      utmTerm: data.utmTerm,
      isActive: true,
    })
    .returning();
  return session!;
}

// POST /track — PUBLIC beacon by design (no auth). Body:
// { anonymousId, path, title?, referrer?, userAgent?, sessionId? }
// Returns { visitorId, sessionId }.
//
// STANDARD: public write endpoints are rate-limited per IP — 10/min
// here (a browser beacon fires a few times per visit, so 10/min is
// far above legitimate use and only stops a hammering loop). The
// helper is in-memory per isolate (best-effort under multi-isolate);
// a limited request gets 429 + Retry-After, legitimate single
// submissions are unaffected.
const publicWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});
app.post("/track", publicWriteLimiter, async (c) => {
  try {
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, trackEventSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { anonymousId, path, title, referrer, userAgent, sessionId } =
      v.data;

    const db = getApiDb();
    const utmParams =
      typeof referrer === "string" && referrer
        ? extractUTMParams(referrer)
        : {};

    const visitor = await identifyVisitor(db, {
      anonymousId,
      userAgent: userAgent || null,
      referrer: referrer || null,
    });

    let currentSessionId = sessionId;
    // NOTE (preserved quirk): the original looks up ANY active session
    // for the visitor and ignores the supplied sessionId value.
    const activeSession = currentSessionId
      ? await getActiveSession(db, visitor.id)
      : null;

    if (!activeSession) {
      const newSession = await startSession(db, {
        visitorId: visitor.id,
        landingPage: path,
        referrer: referrer || null,
        ...utmParams,
      });
      currentSessionId = newSession.id;
    }

    await db.insert(pageViews).values({
      visitorId: visitor.id,
      sessionId: currentSessionId,
      path,
      title: title || null,
      referrer: referrer || null,
      ...utmParams,
    });

    return c.json({
      visitorId: visitor.id,
      sessionId: currentSessionId,
    });
  } catch (err) {
    console.error("[Analytics Track] Error:", err);
    return c.json({ error: "Tracking failed." }, 500);
  }
});

export default app;
