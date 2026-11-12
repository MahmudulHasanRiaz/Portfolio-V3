import { getDb, leads, pageViews, visitorSessions } from "@repo/database";
import { eq, and, isNull, sql } from "drizzle-orm";

const db = getDb();

export interface AttributionData {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
}

export class LeadAttributionService {
  async getAttributionForVisitor(visitorId: string): Promise<AttributionData | null> {
    const [session] = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.visitorId, visitorId))
      .orderBy(sql`${visitorSessions.createdAt} DESC`)
      .limit(1);

    if (!session) return null;

    return {
      utmSource: session.utmSource,
      utmMedium: session.utmMedium,
      utmCampaign: session.utmCampaign,
      utmContent: session.utmContent,
      utmTerm: session.utmTerm,
      referrer: session.referrer,
      landingPage: session.landingPage,
    };
  }

  async getLeadAttribution(leadId: string): Promise<AttributionData | null> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) return null;

    return {
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      landingPage: null,
      referrer: null,
    };
  }

  async linkPageViewsToLead(visitorId: string, leadId: string) {
    await db
      .update(pageViews)
      .set({ leadId })
      .where(
        and(
          eq(pageViews.visitorId, visitorId),
          isNull(pageViews.leadId)
        )
      );
  }
}
