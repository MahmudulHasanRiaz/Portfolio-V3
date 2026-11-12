# Phase 14 — Analytics & Tracking System: Implementation Plan

**Goal:** Build internal analytics — visitor tracking, session management, page view tracking, UTM attribution, lead attribution, search analytics integration, dashboard reporting.

**Architecture:** First-party tracking only. No Google Analytics or external platforms. Uses `@repo/analytics` package (currently empty), new DB tables, existing `@repo/database`, existing `search_analytics` table, existing `leads` table (already has UTM fields).

## Task 1: Schema — visitors, visitor_sessions, page_views + migration
- Create 3 schema files + update schema index + generate/apply migration
- visitors: id, anonymousId, firstVisit, lastVisit, visitCount, userAgent, referrer
- visitor_sessions: id, visitorId, startTime, endTime, landingPage, referrer, isActive, utmParams (jsonb)
- page_views: id, visitorId, sessionId, path, title, referrer, timestamp, utmParams (jsonb), LeadId (nullable, for attribution)

## Task 2: @repo/analytics — TrackingService (visitor, session, page view)
- VisitorService: create/find visitor, update visit count, manage anonymous visitor ID
- SessionService: start/end session, extend expiry
- PageViewService: record page view
- UTM capture from URL params

## Task 3: @repo/analytics — AttributionService + AggregationService
- LeadAttributionService: connect UTM params from session to lead creation
- AnalyticsAggregator: traffic summary, top pages, top referrers, UTM performance queries
- SearchAnalytics integration: query wrapper over existing search_analytics table

## Task 4: Analytics API routes
- POST /api/analytics/track (PUBLIC) — page view / session heartbeat
- GET /api/analytics/summary (AUTH) — traffic overview
- GET /api/analytics/pages (AUTH) — top pages
- GET /api/analytics/referrers (AUTH) — top referrers
- GET /api/analytics/utm (AUTH) — UTM performance

## Task 5: Analytics Dashboard pages
- /dashboard/analytics — overview with key metrics
- /dashboard/analytics/traffic — traffic summary
- /dashboard/analytics/pages — top pages
- /dashboard/analytics/referrers — top referrers
- /dashboard/analytics/utm — UTM performance

## Task 6: Navigation + Middleware + Lead Attribution Wiring
- Add Analytics nav entry
- Add /api/analytics to public prefixes in middleware
- Wire UTM attribution into lead creation in CRM lead repository

## Task 7: Typecheck, verify, write 4 reports
