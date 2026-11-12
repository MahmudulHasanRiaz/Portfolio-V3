# Phase 14 — Analytics & Tracking System: Acceptance Report

## Requirements Coverage

### UTM Tracking ✅
- `extractUTMParams()` parses all 5 UTM params from URLs
- `hasUTMParams()` detects presence of UTM data
- UTM persisted in `visitor_sessions`, `page_views`, and `leads` tables
- `UTMPerformance` aggregation reports on source/medium/campaign with visit and lead counts

### Visitor Tracking ✅
- `VisitorService.identify()` creates or updates visitors by `anonymousId`
- Tracks: firstVisit, lastVisit, visitCount, userAgent, referrer
- Anonymous visitor ID pattern (no PII required)

### Session Tracking ✅
- `SessionService.startSession()` creates session with landing page, referrer, UTM
- `SessionService.endSession()` marks session inactive
- `SessionService.getActiveSession()` returns current active session
- Deactivates prior active sessions on new session start

### Page View Tracking ✅
- `PageViewService.track()` records path, title, referrer, timestamp, UTM
- Links to visitor, session, and optionally to lead
- Supports future reporting via `path` and `timestamp` columns

### Lead Attribution ✅
- `LeadAttributionService.getAttributionForVisitor()` retrieves UTM from visitor's last session
- `LeadAttributionService.getLeadAttribution()` retrieves UTM directly from lead record
- `LeadAttributionService.linkPageViewsToLead()` connects visitor's page views to lead
- Wired into CRM lead creation POST handler

### Search Analytics Integration ✅
- `AnalyticsAggregator.getTopSearchQueries()` queries `search_analytics` table
- `/api/analytics/search` endpoint exposes search query data
- Search analytics dashboard page displays results

### Dashboard Reporting ✅
- Overview page with summary cards + top 5 lists + time period selector
- Traffic summary page
- Top pages table
- Top referrers table
- UTM performance table
- Search queries table
- All pages support 7d/30d/90d time ranges

### Analytics APIs ✅
- `POST /api/analytics/track` — public, records page views + session heartbeat
- `GET /api/analytics/summary` — auth-protected
- `GET /api/analytics/pages` — auth-protected
- `GET /api/analytics/referrers` — auth-protected
- `GET /api/analytics/utm` — auth-protected
- `GET /api/analytics/search` — auth-protected

## Not Covered (by design)
- External analytics platforms (Google Analytics, etc.) — excluded per requirements
- Real-time analytics — query-time aggregation only
- Event tracking beyond page views — future phase
- A/B testing — separate concern
