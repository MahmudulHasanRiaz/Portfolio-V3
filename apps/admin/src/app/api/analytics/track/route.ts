import { NextRequest, NextResponse } from "next/server";
import { VisitorService, SessionService, PageViewService, extractUTMParams } from "@repo/analytics";

const visitorService = new VisitorService();
const sessionService = new SessionService();
const pageViewService = new PageViewService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonymousId, path, title, referrer, userAgent, sessionId } = body;

    if (!anonymousId || !path) {
      return NextResponse.json({ error: "anonymousId and path are required." }, { status: 400 });
    }

    const utmParams = referrer ? extractUTMParams(referrer) : {};

    const visitor = await visitorService.identify({
      anonymousId,
      userAgent: userAgent || null,
      referrer: referrer || null,
    });

    let currentSessionId = sessionId;
    const activeSession = currentSessionId
      ? await sessionService.getActiveSession(visitor.id)
      : null;

    if (!activeSession) {
      const newSession = await sessionService.startSession({
        visitorId: visitor.id,
        landingPage: path,
        referrer: referrer || null,
        ...utmParams,
      });
      currentSessionId = newSession.id;
    }

    await pageViewService.track({
      visitorId: visitor.id,
      sessionId: currentSessionId,
      path,
      title: title || null,
      referrer: referrer || null,
      ...utmParams,
    });

    return NextResponse.json({
      visitorId: visitor.id,
      sessionId: currentSessionId,
    });
  } catch (error) {
    console.error("[Analytics Track] Error:", error);
    return NextResponse.json({ error: "Tracking failed." }, { status: 500 });
  }
}
