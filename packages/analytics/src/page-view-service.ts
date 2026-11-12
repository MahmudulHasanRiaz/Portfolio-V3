import { getDb, pageViews } from "@repo/database";
import { eq, count } from "drizzle-orm";

export interface PageViewData {
  visitorId?: string | null;
  sessionId?: string | null;
  path: string;
  title?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  leadId?: string | null;
}

export class PageViewService {
  async track(data: PageViewData) {
    const db = getDb();
    const [view] = await db
      .insert(pageViews)
      .values({
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        path: data.path,
        title: data.title,
        referrer: data.referrer,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
        leadId: data.leadId,
      })
      .returning();
    return view!;
  }

  async getCountByVisitor(visitorId: string) {
    const db = getDb();
    const [result] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(eq(pageViews.visitorId, visitorId));
    return result?.count ?? 0;
  }
}
