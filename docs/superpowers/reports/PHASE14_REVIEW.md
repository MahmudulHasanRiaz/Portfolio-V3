# Phase 14 — Analytics & Tracking System: Implementation Review

## Overview

Phase 14 builds a complete first-party analytics and attribution system — visitor tracking, session management, page view tracking, UTM capture, lead attribution, search analytics integration, analytics API, and dashboard reporting. No external analytics platforms or Google Analytics dependencies.

## Architecture

- **Core Package:** `@repo/analytics` — 6 service modules (Visitor, Session, PageView, UTM, Attribution, Aggregation)
- **Database:** 3 new tables (visitors, visitor_sessions, page_views) + existing (search_analytics, leads with UTM fields)
- **API Routes:** 6 endpoints under `/api/analytics/` — 1 public (track), 5 auth-protected (summary, pages, referrers, utm, search)
- **Dashboard UI:** 6 pages under `/dashboard/analytics/` — overview, traffic, pages, referrers, UTM, search
- **Lead Attribution:** Wired into CRM lead creation endpoint — links visitor page views to leads

## Data Model

```
visitors (id, anonymousId, firstVisit, lastVisit, visitCount, userAgent, referrer)
  │
  └── visitor_sessions (id, visitorId, startTime, endTime, landingPage, referrer, 
  │     isActive, utmSource, utmMedium, utmCampaign, utmContent, utmTerm)
  │
  └── page_views (id, visitorId, sessionId, path, title, referrer, timestamp,
                   utmSource, utmMedium, utmCampaign, utmContent, utmTerm, leadId)

leads (already existed — utmSource, utmMedium, utmCampaign, utmContent, utmTerm)
search_analytics (already existed — query, resultCount, createdAt)
```

## Files Created/Modified

### @repo/analytics package (6 source files)
- `visitor-service.ts` — identify/create visitors, track return visits
- `session-service.ts` — start/end/get active sessions with UTM
- `page-view-service.ts` — record page views, count by visitor
- `utm-service.ts` — extract UTM params from URLs, detect presence
- `lead-attribution-service.ts` — get attribution for visitor/lead, link page views
- `analytics-aggregator.ts` — traffic summary, top pages, referrers, UTM, search queries

### Database Schema (3 files)
- `analytics/visitors.ts`, `analytics/visitor-sessions.ts`, `analytics/page-views.ts`

### API Routes (6 files)
- `POST /api/analytics/track` — public, records page views + session management
- `GET /api/analytics/summary` — traffic overview
- `GET /api/analytics/pages` — top pages by views
- `GET /api/analytics/referrers` — top referrers
- `GET /api/analytics/utm` — UTM campaign performance
- `GET /api/analytics/search` — top search queries

### Dashboard Pages (6 files)
- `/dashboard/analytics` — overview with summary cards and top lists
- `/dashboard/analytics/traffic` — traffic summary
- `/dashboard/analytics/pages` — top pages table
- `/dashboard/analytics/referrers` — top referrers table
- `/dashboard/analytics/utm` — UTM performance table
- `/dashboard/analytics/search` — search queries table

### Infrastructure (3 files modified)
- `navigation.ts` — Analytics nav section with 6 sub-items
- `middleware.ts` — `/api/analytics` added to public prefixes
- `leads/route.ts` — UTM attribution wired into lead creation
