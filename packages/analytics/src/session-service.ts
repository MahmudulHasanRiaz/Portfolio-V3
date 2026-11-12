import { getDb, visitorSessions } from "@repo/database";
import { eq, and } from "drizzle-orm";

export interface SessionData {
  visitorId: string;
  landingPage?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}

export class SessionService {
  async startSession(data: SessionData) {
    const db = getDb();

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

  async endSession(sessionId: string) {
    const db = getDb();
    const [session] = await db
      .update(visitorSessions)
      .set({ isActive: false, endTime: new Date() })
      .where(eq(visitorSessions.id, sessionId))
      .returning();
    return session!;
  }

  async getActiveSession(visitorId: string) {
    const db = getDb();
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
}
