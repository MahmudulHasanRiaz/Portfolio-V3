# Complete Route Map

> **PRD Reference:** [PRD.md](../PRD.md) — Information Architecture (§ Sitemap), Dashboard Routes  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Public Website Routes (`apps/web`)

### 1.1 Core Pages

| Route | File | Rendering | SEO Entity | Auth |
|-------|------|-----------|------------|------|
| `/` | `app/page.tsx` | Static + Revalidate | — | Public |
| `/about` | `app/about/page.tsx` | ISR | Page | Public |
| `/contact` | `app/contact/page.tsx` | Dynamic | Page | Public |
| `/search` | `app/search/page.tsx` | Dynamic | — | Public |
| `/book` | `app/book/page.tsx` | ISR | Page | Public |
| `/press-kit` | `app/press-kit/page.tsx` | ISR | Page | Public |
| `/timeline` | `app/timeline/page.tsx` | ISR | Page | Public |
| `/newsletter` | `app/newsletter/page.tsx` | ISR | Page | Public |

### 1.2 Developer Identity

| Route | File | Rendering | SEO Entity |
|-------|------|-----------|------------|
| `/developer` | `app/developer/page.tsx` | ISR | Profile |
| `/resume` | `app/developer/resume/route.ts` | Redirect/R2 | — |

### 1.3 Entrepreneur Identity

| Route | File | Rendering | SEO Entity |
|-------|------|-----------|------------|
| `/entrepreneur` | `app/entrepreneur/page.tsx` | ISR | Profile |
| `/ventures` | `app/ventures/page.tsx` | ISR | Venture Listing |
| `/ventures/[slug]` | `app/ventures/[slug]/page.tsx` | ISR | Venture Detail |

### 1.4 Artist Identity

| Route | File | Rendering | SEO Entity |
|-------|------|-----------|------------|
| `/artist` | `app/artist/page.tsx` | ISR | Profile |
| `/artist/schedule` | `app/artist/schedule/page.tsx` | ISR | Schedule |
| `/artist/booking` | `app/artist/booking/page.tsx` | Dynamic | — |
| `/releases` | `app/releases/page.tsx` | ISR | Release Listing |
| `/releases/[slug]` | `app/releases/[slug]/page.tsx` | ISR | Release Detail |

### 1.5 Content Pages

| Route | File | Rendering | SEO Entity |
|-------|------|-----------|------------|
| `/services` | `app/services/page.tsx` | ISR | Service Listing |
| `/services/[slug]` | `app/services/[slug]/page.tsx` | ISR | Service Detail |
| `/projects` | `app/projects/page.tsx` | ISR | Project Listing |
| `/projects/[slug]` | `app/projects/[slug]/page.tsx` | ISR | Project Detail |
| `/case-studies` | `app/case-studies/page.tsx` | ISR | Case Study Listing |
| `/case-studies/[slug]` | `app/case-studies/[slug]/page.tsx` | ISR | Case Study Detail |
| `/blog` | `app/blog/page.tsx` | ISR | Blog Listing |
| `/blog/category/[slug]` | `app/blog/category/[slug]/page.tsx` | ISR | Category Archive |
| `/blog/tag/[slug]` | `app/blog/tag/[slug]/page.tsx` | ISR | Tag Archive |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | ISR | Blog Article |
| `/resources` | `app/resources/page.tsx` | ISR | Resource Listing |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` | ISR | Resource Detail |
| `/media` | `app/media/page.tsx` | ISR | Media Listing |
| `/media/[slug]` | `app/media/[slug]/page.tsx` | ISR | Media Detail |

---

## 2. Dashboard Routes (`apps/dashboard`)

All dashboard routes require authentication. The shell layout (sidebar + topbar) wraps all routes.

### 2.1 Overview

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `DashboardHome` | Widget grid with Daily Overview |

### 2.2 Content Management

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/content` | `ContentManager` | Tree-view content hierarchy |
| `/dashboard/blog` | `BlogList` | DataTable with status filters |
| `/dashboard/blog/new` | `BlogForm` | Create post |
| `/dashboard/blog/[id]` | `BlogForm` | Edit post |
| `/dashboard/projects` | `ProjectsList` | DataTable |
| `/dashboard/projects/new` | `ProjectsForm` | Create project |
| `/dashboard/projects/[id]` | `ProjectsForm` | Edit project |
| `/dashboard/services` | `ServicesList` | DataTable with drag-drop reorder |
| `/dashboard/services/new` | `ServicesForm` | Create service |
| `/dashboard/services/[id]` | `ServicesForm` | Edit service |
| `/dashboard/releases` | `ReleasesList` | DataTable + thumbnails |
| `/dashboard/releases/new` | `ReleasesForm` | Create release |
| `/dashboard/releases/[id]` | `ReleasesForm` | Edit release |
| `/dashboard/ventures` | `VenturesList` | DataTable |
| `/dashboard/ventures/new` | `VenturesForm` | Create venture |
| `/dashboard/ventures/[id]` | `VenturesForm` | Edit venture |
| `/dashboard/media` | `MediaLibrary` | Grid layout, drag-upload |

### 2.3 CRM

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/crm` | `LeadPipeline` | Pipeline view (kanban) + DataTable |
| `/dashboard/crm/leads` | `LeadList` | Table view |
| `/dashboard/crm/leads/[id]` | `LeadDetail` | Detail with timeline |
| `/dashboard/forms` | `FormsList` | Form list |
| `/dashboard/forms/new` | `FormsBuilder` | Build form |
| `/dashboard/forms/[id]` | `FormsBuilder` | Edit form |
| `/dashboard/forms/[id]/submissions` | `FormSubmissions` | View submissions |

### 2.4 Operations

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/freelance` | `FreelanceList` | Project list with filters |
| `/dashboard/freelance/new` | `FreelanceForm` | Create project |
| `/dashboard/freelance/[id]` | `FreelanceDetail` | Tabs: Overview, Milestones, Deliverables, Finance, Portal, Activity |
| `/dashboard/events` | `EventsList` | Event list |
| `/dashboard/events/new` | `EventForm` | Create event |
| `/dashboard/events/[id]` | `EventDetail` | Tabs: Details, Logistics, Finance, Activity |
| `/dashboard/events/availability` | `AvailabilityCalendar` | Calendar grid |
| `/dashboard/finance` | `FinanceDashboard` | Metrics + charts |
| `/dashboard/finance/payments` | `PaymentsLog` | Payment list |
| `/dashboard/finance/expenses` | `ExpensesLog` | Expense list |
| `/dashboard/finance/invoices` | `InvoicesList` | Invoice list |

### 2.5 Portal & Proposals

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/portal` | `PortalList` | Portal-enabled project list |
| `/dashboard/proposals` | `ProposalsList` | Template list |
| `/dashboard/proposals/new` | `ProposalForm` | Create template |
| `/dashboard/proposals/[id]` | `ProposalForm` | Edit template |

### 2.6 System

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/seo` | `SEODashboard` | Audit scores, broken links |
| `/dashboard/seo/redirects` | `RedirectManager` | Redirect CRUD |
| `/dashboard/users` | `UsersList` | DataTable with roles (Super Admin only) |
| `/dashboard/users/new` | `UserForm` | Create user |
| `/dashboard/users/[id]` | `UserForm` | Edit user |
| `/dashboard/settings` | `SettingsPage` | Tabbed: General, Notifications, Payment Methods, Categories |

---

## 3. Client Portal Routes (`apps/portal`)

All routes require a valid `portal_token` (from URL param or session cookie).

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/portal/login` | `PortalLogin` | None | Login page (token from URL or email) |
| `/portal/[token]` | `PortalLayout` | Token | Redirects to overview tab |
| `/portal/[token]/overview` | `OverviewTab` | Token | Project summary + activity |
| `/portal/[token]/milestones` | `MilestonesTab` | Token | Milestone timeline |
| `/portal/[token]/deliverables` | `DeliverablesTab` | Token | File review + approve/revision |
| `/portal/[token]/messages` | `MessagesTab` | Token | Chat thread |
| `/portal/[token]/payments` | `PaymentsTab` | Token | Payment summary + invoice download |

---

## 4. API Routes

All API routes live under the respective app's `/api/` directory. See [API_DESIGN.md](./API_DESIGN.md) for full details.

### 4.1 Content APIs (`apps/web` + `apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/posts` | `posts.list` |
| GET | `/api/posts/[id]` | `posts.get` |
| POST | `/api/posts` | `posts.create` |
| PUT | `/api/posts/[id]` | `posts.update` |
| DELETE | `/api/posts/[id]` | `posts.delete` |
| PUT | `/api/posts/[id]/status` | `posts.changeStatus` |
| GET | `/api/projects` | `projects.list` |
| GET | `/api/projects/[id]` | `projects.get` |
| POST | `/api/projects` | `projects.create` |
| PUT | `/api/projects/[id]` | `projects.update` |
| DELETE | `/api/projects/[id]` | `projects.delete` |
| GET | `/api/services` | `services.list` |
| GET | `/api/services/[id]` | `services.get` |
| POST | `/api/services` | `services.create` |
| PUT | `/api/services/[id]` | `services.update` |
| DELETE | `/api/services/[id]` | `services.delete` |
| PUT | `/api/services/reorder` | `services.reorder` |
| GET | `/api/releases` | `releases.list` |
| GET | `/api/releases/[id]` | `releases.get` |
| POST | `/api/releases` | `releases.create` |
| PUT | `/api/releases/[id]` | `releases.update` |
| DELETE | `/api/releases/[id]` | `releases.delete` |
| GET | `/api/ventures` | `ventures.list` |
| GET | `/api/ventures/[id]` | `ventures.get` |
| POST | `/api/ventures` | `ventures.create` |
| PUT | `/api/ventures/[id]` | `ventures.update` |
| DELETE | `/api/ventures/[id]` | `ventures.delete` |
| GET | `/api/resources` | `resources.list` |
| GET | `/api/resources/[id]` | `resources.get` |
| POST | `/api/resources` | `resources.create` |
| PUT | `/api/resources/[id]` | `resources.update` |
| DELETE | `/api/resources/[id]` | `resources.delete` |
| GET | `/api/case-studies` | `caseStudies.list` |
| GET | `/api/case-studies/[id]` | `caseStudies.get` |
| POST | `/api/case-studies` | `caseStudies.create` |
| PUT | `/api/case-studies/[id]` | `caseStudies.update` |
| DELETE | `/api/case-studies/[id]` | `caseStudies.delete` |

### 4.2 CRM APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/leads` | `leads.list` |
| GET | `/api/leads/[id]` | `leads.get` |
| POST | `/api/leads` | `leads.create` |
| PUT | `/api/leads/[id]` | `leads.update` |
| PUT | `/api/leads/[id]/status` | `leads.changeStatus` |
| PUT | `/api/leads/[id]/assign` | `leads.assign` |
| GET | `/api/leads/[id]/activities` | `leads.getActivities` |
| POST | `/api/leads/[id]/notes` | `leads.addNote` |
| GET | `/api/leads/follow-up` | `leads.followUpQueue` |
| GET | `/api/forms` | `forms.list` |
| GET | `/api/forms/[id]` | `forms.get` |
| POST | `/api/forms` | `forms.create` |
| PUT | `/api/forms/[id]` | `forms.update` |
| DELETE | `/api/forms/[id]` | `forms.delete` |
| GET | `/api/forms/[id]/submissions` | `forms.submissions` |
| GET | `/api/forms/[id]/analytics` | `forms.analytics` |
| POST | `/api/forms/[slug]/submit` | `forms.submit` |

### 4.3 Media APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/media` | `media.list` |
| POST | `/api/media/upload` | `media.upload` |
| DELETE | `/api/media/[id]` | `media.delete` |
| PUT | `/api/media/[id]` | `media.update` |
| GET | `/api/media/folders` | `media.listFolders` |
| POST | `/api/media/folders` | `media.createFolder` |

### 4.4 Search APIs (`apps/web`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/search` | `search.query` |
| POST | `/api/search/index` | `search.reindex` |
| GET | `/api/search/synonyms` | `search.listSynonyms` |
| POST | `/api/search/synonyms` | `search.addSynonym` |

### 4.5 Freelance Project APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/projects` | `freelance.list` |
| GET | `/api/projects/[id]` | `freelance.get` |
| POST | `/api/projects` | `freelance.create` |
| PUT | `/api/projects/[id]` | `freelance.update` |
| PUT | `/api/projects/[id]/status` | `freelance.changeStatus` |
| GET | `/api/projects/[id]/milestones` | `freelance.listMilestones` |
| POST | `/api/projects/[id]/milestones` | `freelance.createMilestone` |
| PUT | `/api/projects/[id]/milestones/[mid]` | `freelance.updateMilestone` |
| GET | `/api/projects/[id]/deliverables` | `freelance.listDeliverables` |
| POST | `/api/projects/[id]/deliverables` | `freelance.uploadDeliverable` |
| PUT | `/api/projects/[id]/deliverables/[did]` | `freelance.updateDeliverable` |
| GET | `/api/projects/[id]/activity` | `freelance.activityLog` |
| GET | `/api/projects/[id]/payments` | `freelance.paymentSummary` |
| GET | `/api/projects/[id]/expenses` | `freelance.expenseList` |

### 4.6 Event APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/events` | `events.list` |
| GET | `/api/events/[id]` | `events.get` |
| POST | `/api/events` | `events.create` |
| PUT | `/api/events/[id]` | `events.update` |
| PUT | `/api/events/[id]/status` | `events.changeStatus` |
| GET | `/api/events/[id]/logistics` | `events.getLogistics` |
| PUT | `/api/events/[id]/logistics` | `events.updateLogistics` |
| GET | `/api/events/availability` | `events.listAvailability` |
| PUT | `/api/events/availability` | `events.updateAvailability` |
| POST | `/api/events/[id]/booking` | `events.submitBooking` |

### 4.7 Finance APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/finance/payments` | `finance.listPayments` |
| POST | `/api/finance/payments` | `finance.createPayment` |
| PUT | `/api/finance/payments/[id]` | `finance.updatePayment` |
| DELETE | `/api/finance/payments/[id]` | `finance.deletePayment` |
| GET | `/api/finance/expenses` | `finance.listExpenses` |
| POST | `/api/finance/expenses` | `finance.createExpense` |
| PUT | `/api/finance/expenses/[id]` | `finance.updateExpense` |
| DELETE | `/api/finance/expenses/[id]` | `finance.deleteExpense` |
| GET | `/api/finance/invoices` | `finance.listInvoices` |
| POST | `/api/finance/invoices` | `finance.createInvoice` |
| PUT | `/api/finance/invoices/[id]` | `finance.updateInvoice` |
| GET | `/api/finance/invoices/[id]/pdf` | `finance.downloadInvoicePdf` |
| GET | `/api/finance/summary` | `finance.dashboardSummary` |
| GET | `/api/finance/payment-methods` | `finance.listPaymentMethods` |
| POST | `/api/finance/payment-methods` | `finance.createPaymentMethod` |
| PUT | `/api/finance/payment-methods/[id]` | `finance.updatePaymentMethod` |

### 4.8 Portal APIs (`apps/portal`)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/portal/login` | `portal.login` |
| GET | `/api/portal/[token]/project` | `portal.getProject` |
| GET | `/api/portal/[token]/milestones` | `portal.listMilestones` |
| GET | `/api/portal/[token]/deliverables` | `portal.listDeliverables` |
| PUT | `/api/portal/[token]/deliverables/[did]/approve` | `portal.approveDeliverable` |
| PUT | `/api/portal/[token]/deliverables/[did]/revision` | `portal.requestRevision` |
| GET | `/api/portal/[token]/payments` | `portal.listPayments` |
| GET | `/api/portal/[token]/invoices/[id]/download` | `portal.downloadInvoice` |
| GET | `/api/portal/[token]/messages` | `portal.listMessages` |
| POST | `/api/portal/[token]/messages` | `portal.sendMessage` |

### 4.9 Proposal APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/proposals/templates` | `proposals.listTemplates` |
| POST | `/api/proposals/templates` | `proposals.createTemplate` |
| PUT | `/api/proposals/templates/[id]` | `proposals.updateTemplate` |
| DELETE | `/api/proposals/templates/[id]` | `proposals.deleteTemplate` |
| POST | `/api/proposals/generate` | `proposals.generate` |
| PUT | `/api/proposals/documents/[id]/status` | `proposals.updateDocumentStatus` |
| GET | `/api/proposals/documents/[id]/pdf` | `proposals.downloadPdf` |

### 4.10 Newsletter APIs (`apps/web` + `apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/newsletter/subscribe` | `newsletter.subscribe` |
| POST | `/api/newsletter/verify` | `newsletter.verify` |
| POST | `/api/newsletter/unsubscribe` | `newsletter.unsubscribe` |
| PUT | `/api/newsletter/preferences` | `newsletter.updatePreferences` |
| GET | `/api/newsletter/campaigns` | `newsletter.listCampaigns` |
| POST | `/api/newsletter/campaigns` | `newsletter.createCampaign` |
| PUT | `/api/newsletter/campaigns/[id]` | `newsletter.updateCampaign` |
| POST | `/api/newsletter/campaigns/[id]/send` | `newsletter.sendCampaign` |
| GET | `/api/newsletter/metrics` | `newsletter.dashboardMetrics` |

### 4.11 SEO APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/seo/redirects` | `seo.listRedirects` |
| POST | `/api/seo/redirects` | `seo.createRedirect` |
| DELETE | `/api/seo/redirects/[id]` | `seo.deleteRedirect` |
| GET | `/api/seo/sitemap-status` | `seo.sitemapStatus` |
| GET | `/api/seo/broken-links` | `seo.brokenLinks` |
| POST | `/api/seo/reindex` | `seo.reindex` |

### 4.12 Auth & Notification APIs (`apps/dashboard`)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/auth/login` | `auth.login` |
| POST | `/api/auth/logout` | `auth.logout` |
| POST | `/api/auth/register` | `auth.register` |
| GET | `/api/auth/session` | `auth.getSession` |
| GET | `/api/notifications/settings` | `notifications.getSettings` |
| PUT | `/api/notifications/settings` | `notifications.updateSettings` |
| POST | `/api/notifications/test` | `notifications.test` |

### 4.13 Cron Endpoints (All Apps)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/cron/schedule` | CRON_SECRET | Content publishing |
| POST | `/api/cron/expire` | CRON_SECRET | Content expiry |
| POST | `/api/cron/reindex` | CRON_SECRET | Search index sync |
| POST | `/api/cron/newsletter` | CRON_SECRET | Campaign dispatch |
| POST | `/api/cron/media-cleanup` | CRON_SECRET | Orphan media removal |
| POST | `/api/cron/retry-notifications` | CRON_SECRET | Failed notification retry |
| GET | `/api/health` | None | Health check |

---

## 5. Route Count Summary

| Category | Count |
|----------|-------|
| Public Website Pages | 30 |
| Dashboard Pages | 45 |
| Client Portal Pages | 7 |
| API Endpoints | 96 |
| Cron Endpoints | 7 |
| **Total** | **185** |
