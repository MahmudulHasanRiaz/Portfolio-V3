# Hono API — Route Map

Generated from the route definitions in `apps/api/src/routes/`. Every entry below is a real registered route (method + full path). If a route is added, removed, or moved, regenerate this file from the code — do not hand-edit the list.

## How the API is organized

- `src/index.ts` mounts three top-level routers: `/api/public` (public content), `/api/admin` (admin CRUD, authenticated), `/api/auth` (Better Auth).
- `src/routes/admin/index.ts` mounts 27 sub-routers by resource (one per resource). Each resource is a directory (e.g. `routes/admin/finance/`) with focused files per sub-resource plus a `helpers.ts` and an `index.ts` that mounts them at `/`. The import `"./finance"` resolves to `finance/index.ts`, so the mount in `admin/index.ts` never changes when a resource is split.
- Shared logic lives in `src/lib/` (`admin-auth`, `errors`, `rate-limit`, `side-effects`, `validate`, `public-content`, `integrations`, `default-language`, `shared`).
- Auth: every `/api/admin/*` route calls `requireAuth` (a valid Better Auth session) unless marked "Public (no auth)" below. `/api/public/*` uses the content token (env token or per-integration token). `/api/auth/*` is the Better Auth handler.

**Total: 258 routes.**

## public (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/public/content/:type` | Public (content token) | Get content by id | `public.ts` |
| GET | `/api/public/content/:type/:slug` | Public (content token) | Get content by id | `public.ts` |
| POST | `/api/public/leads` | Public (content token) | Create lead | `public.ts` |
| GET | `/api/public/settings` | Public (content token) | List settings | `public.ts` |

## auth (2 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| ALL | `/api/auth/*` | Public (auth) | Auth handler (all methods) | `auth.ts` |
| GET | `/api/auth/user/roles` | Public (auth) | List roles | `auth.ts` |

## abandoned (3 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/abandoned` | Authenticated | List abandoned | `admin/abandoned.ts` |
| POST | `/api/admin/abandoned` | Public (no auth) | Create abandoned | `admin/abandoned.ts` |
| DELETE | `/api/admin/abandoned/:id` | Authenticated | Delete abandoned | `admin/abandoned.ts` |

## analytics (6 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/analytics/pages` | Authenticated | List pages | `admin/analytics/reports.ts` |
| GET | `/api/admin/analytics/referrers` | Authenticated | List referrers | `admin/analytics/reports.ts` |
| GET | `/api/admin/analytics/search` | Authenticated | List search | `admin/analytics/reports.ts` |
| GET | `/api/admin/analytics/summary` | Authenticated | List summary | `admin/analytics/reports.ts` |
| POST | `/api/admin/analytics/track` | Public (no auth) | Create track | `admin/analytics/track.ts` |
| GET | `/api/admin/analytics/utm` | Authenticated | List utm | `admin/analytics/reports.ts` |

## content (14 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/content/:type` | Authenticated | Get content by id | `admin/content/items.ts` |
| POST | `/api/admin/content/:type` | Authenticated | Run content action (:type) | `admin/content/items.ts` |
| DELETE | `/api/admin/content/:type/:id` | Authenticated | Delete content | `admin/content/items.ts` |
| GET | `/api/admin/content/:type/:id` | Authenticated | Get content by id | `admin/content/items.ts` |
| PUT | `/api/admin/content/:type/:id` | Authenticated | Update content | `admin/content/items.ts` |
| POST | `/api/admin/content/:type/:id/transition` | Authenticated | Run transition action (transition) | `admin/content/items.ts` |
| GET | `/api/admin/content/categories` | Authenticated | List categories | `admin/content/categories.ts` |
| POST | `/api/admin/content/categories` | Authenticated | Create categorie | `admin/content/categories.ts` |
| DELETE | `/api/admin/content/categories/:id` | Authenticated | Delete categorie | `admin/content/categories.ts` |
| PUT | `/api/admin/content/categories/:id` | Authenticated | Update categorie | `admin/content/categories.ts` |
| GET | `/api/admin/content/tags` | Authenticated | List tags | `admin/content/tags.ts` |
| POST | `/api/admin/content/tags` | Authenticated | Create tag | `admin/content/tags.ts` |
| DELETE | `/api/admin/content/tags/:id` | Authenticated | Delete tag | `admin/content/tags.ts` |
| PUT | `/api/admin/content/tags/:id` | Authenticated | Update tag | `admin/content/tags.ts` |

## content-taxonomy (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/content-taxonomy/:type/:id/categories` | Authenticated | Get categorie categories | `admin/content-taxonomy.ts` |
| POST | `/api/admin/content-taxonomy/:type/:id/categories` | Authenticated | Run categorie action (categories) | `admin/content-taxonomy.ts` |
| GET | `/api/admin/content-taxonomy/:type/:id/tags` | Authenticated | Get tag tags | `admin/content-taxonomy.ts` |
| POST | `/api/admin/content-taxonomy/:type/:id/tags` | Authenticated | Run tag action (tags) | `admin/content-taxonomy.ts` |

## cron (2 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/cron/publish` | Public (no auth) | List publish | `admin/cron.ts` |
| GET | `/api/admin/cron/workflows` | Public (no auth) | List workflows | `admin/cron.ts` |

## directory (15 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/directory/clients` | Authenticated | List clients | `admin/directory/clients.ts` |
| POST | `/api/admin/directory/clients` | Authenticated | Create client | `admin/directory/clients.ts` |
| DELETE | `/api/admin/directory/clients/:id` | Authenticated | Delete client | `admin/directory/clients.ts` |
| GET | `/api/admin/directory/clients/:id` | Authenticated | Get client by id | `admin/directory/clients.ts` |
| PUT | `/api/admin/directory/clients/:id` | Authenticated | Update client | `admin/directory/clients.ts` |
| GET | `/api/admin/directory/platforms` | Authenticated | List platforms | `admin/directory/platforms.ts` |
| POST | `/api/admin/directory/platforms` | Authenticated | Create platform | `admin/directory/platforms.ts` |
| DELETE | `/api/admin/directory/platforms/:id` | Authenticated | Delete platform | `admin/directory/platforms.ts` |
| GET | `/api/admin/directory/platforms/:id` | Authenticated | Get platform by id | `admin/directory/platforms.ts` |
| PUT | `/api/admin/directory/platforms/:id` | Authenticated | Update platform | `admin/directory/platforms.ts` |
| GET | `/api/admin/directory/technologies` | Authenticated | List technologies | `admin/directory/technologies.ts` |
| POST | `/api/admin/directory/technologies` | Authenticated | Create technologie | `admin/directory/technologies.ts` |
| DELETE | `/api/admin/directory/technologies/:id` | Authenticated | Delete technologie | `admin/directory/technologies.ts` |
| GET | `/api/admin/directory/technologies/:id` | Authenticated | Get technologie by id | `admin/directory/technologies.ts` |
| PUT | `/api/admin/directory/technologies/:id` | Authenticated | Update technologie | `admin/directory/technologies.ts` |

## entity-tags (2 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/entity-tags/:entity/:id` | Authenticated | Get entity-tag by id | `admin/entity-tags.ts` |
| POST | `/api/admin/entity-tags/:entity/:id` | Authenticated | Run entity-tag action (:id) | `admin/entity-tags.ts` |

## entity-technologies (3 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/entity-technologies` | Authenticated | List entity-technologies | `admin/entity-technologies.ts` |
| GET | `/api/admin/entity-technologies/:entity/:id` | Authenticated | Get entity-technologie by id | `admin/entity-technologies.ts` |
| POST | `/api/admin/entity-technologies/:entity/:id` | Authenticated | Run entity-technologie action (:id) | `admin/entity-technologies.ts` |

## faqs (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/faqs` | Authenticated | List faqs | `admin/faqs.ts` |
| POST | `/api/admin/faqs` | Authenticated | Create faq | `admin/faqs.ts` |
| DELETE | `/api/admin/faqs/:id` | Authenticated | Delete faq | `admin/faqs.ts` |
| PUT | `/api/admin/faqs/:id` | Authenticated | Update faq | `admin/faqs.ts` |

## finance (29 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/finance/expense-categories` | Authenticated | List expense-categories | `admin/finance/expense-categories.ts` |
| POST | `/api/admin/finance/expense-categories` | Authenticated | Create expense-categorie | `admin/finance/expense-categories.ts` |
| DELETE | `/api/admin/finance/expense-categories/:id` | Authenticated | Delete expense-categorie | `admin/finance/expense-categories.ts` |
| GET | `/api/admin/finance/expense-categories/:id` | Authenticated | Get expense-categorie by id | `admin/finance/expense-categories.ts` |
| PUT | `/api/admin/finance/expense-categories/:id` | Authenticated | Update expense-categorie | `admin/finance/expense-categories.ts` |
| GET | `/api/admin/finance/expenses` | Authenticated | List expenses | `admin/finance/expenses.ts` |
| POST | `/api/admin/finance/expenses` | Authenticated | Create expense | `admin/finance/expenses.ts` |
| DELETE | `/api/admin/finance/expenses/:id` | Authenticated | Delete expense | `admin/finance/expenses.ts` |
| GET | `/api/admin/finance/expenses/:id` | Authenticated | Get expense by id | `admin/finance/expenses.ts` |
| PUT | `/api/admin/finance/expenses/:id` | Authenticated | Update expense | `admin/finance/expenses.ts` |
| GET | `/api/admin/finance/invoices` | Authenticated | List invoices | `admin/finance/invoices.ts` |
| POST | `/api/admin/finance/invoices` | Authenticated | Create invoice | `admin/finance/invoices.ts` |
| DELETE | `/api/admin/finance/invoices/:id` | Authenticated | Delete invoice | `admin/finance/invoices.ts` |
| GET | `/api/admin/finance/invoices/:id` | Authenticated | Get invoice by id | `admin/finance/invoices.ts` |
| PUT | `/api/admin/finance/invoices/:id` | Authenticated | Update invoice | `admin/finance/invoices.ts` |
| GET | `/api/admin/finance/invoices/:id/pdf` | Public (no auth) | Get pdf pdf | `admin/finance/invoices.ts` |
| POST | `/api/admin/finance/invoices/:id/pdf` | Public (no auth) | Generate pdf PDF | `admin/finance/invoices.ts` |
| POST | `/api/admin/finance/invoices/:id/status` | Authenticated | Run statu action (status) | `admin/finance/invoices.ts` |
| GET | `/api/admin/finance/payment-methods` | Authenticated | List payment-methods | `admin/finance/payment-methods.ts` |
| POST | `/api/admin/finance/payment-methods` | Authenticated | Create payment-method | `admin/finance/payment-methods.ts` |
| DELETE | `/api/admin/finance/payment-methods/:id` | Authenticated | Delete payment-method | `admin/finance/payment-methods.ts` |
| GET | `/api/admin/finance/payment-methods/:id` | Authenticated | Get payment-method by id | `admin/finance/payment-methods.ts` |
| PUT | `/api/admin/finance/payment-methods/:id` | Authenticated | Update payment-method | `admin/finance/payment-methods.ts` |
| GET | `/api/admin/finance/payments` | Authenticated | List payments | `admin/finance/payments.ts` |
| POST | `/api/admin/finance/payments` | Authenticated | Create payment | `admin/finance/payments.ts` |
| DELETE | `/api/admin/finance/payments/:id` | Authenticated | Delete payment | `admin/finance/payments.ts` |
| GET | `/api/admin/finance/payments/:id` | Authenticated | Get payment by id | `admin/finance/payments.ts` |
| PUT | `/api/admin/finance/payments/:id` | Authenticated | Update payment | `admin/finance/payments.ts` |
| GET | `/api/admin/finance/summary` | Authenticated | List summary | `admin/finance/summary.ts` |

## freelance (15 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/freelance/projects` | Authenticated | List projects | `admin/freelance/projects.ts` |
| POST | `/api/admin/freelance/projects` | Authenticated | Create project | `admin/freelance/projects.ts` |
| DELETE | `/api/admin/freelance/projects/:id` | Authenticated | Delete project | `admin/freelance/projects.ts` |
| GET | `/api/admin/freelance/projects/:id` | Authenticated | Get project by id | `admin/freelance/projects.ts` |
| PUT | `/api/admin/freelance/projects/:id` | Authenticated | Update project | `admin/freelance/projects.ts` |
| GET | `/api/admin/freelance/projects/:id/activities` | Authenticated | Get activitie activities | `admin/freelance/projects.ts` |
| GET | `/api/admin/freelance/projects/:id/deliverables` | Authenticated | Get deliverable deliverables | `admin/freelance/deliverables.ts` |
| POST | `/api/admin/freelance/projects/:id/deliverables` | Authenticated | Run deliverable action (deliverables) | `admin/freelance/deliverables.ts` |
| DELETE | `/api/admin/freelance/projects/:id/deliverables/:did` | Authenticated | Delete deliverable | `admin/freelance/deliverables.ts` |
| PUT | `/api/admin/freelance/projects/:id/deliverables/:did` | Authenticated | Update deliverable | `admin/freelance/deliverables.ts` |
| GET | `/api/admin/freelance/projects/:id/milestones` | Authenticated | Get milestone milestones | `admin/freelance/milestones.ts` |
| POST | `/api/admin/freelance/projects/:id/milestones` | Authenticated | Run milestone action (milestones) | `admin/freelance/milestones.ts` |
| DELETE | `/api/admin/freelance/projects/:id/milestones/:mid` | Authenticated | Delete milestone | `admin/freelance/milestones.ts` |
| PUT | `/api/admin/freelance/projects/:id/milestones/:mid` | Authenticated | Update milestone | `admin/freelance/milestones.ts` |
| POST | `/api/admin/freelance/projects/:id/portal` | Authenticated | Run portal action (portal) | `admin/freelance/projects.ts` |

## homepage (6 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| POST | `/api/admin/homepage/reorder` | Authenticated | Create reorder | `admin/homepage.ts` |
| GET | `/api/admin/homepage/sections` | Authenticated | List sections | `admin/homepage.ts` |
| PATCH | `/api/admin/homepage/sections/:id` | Authenticated | Update section | `admin/homepage.ts` |
| POST | `/api/admin/homepage/sections/:id/toggle` | Authenticated | Run toggle action (toggle) | `admin/homepage.ts` |
| POST | `/api/admin/homepage/versions` | Authenticated | Create version | `admin/homepage.ts` |
| POST | `/api/admin/homepage/versions/:id/restore` | Authenticated | Run restore action (restore) | `admin/homepage.ts` |

## leads (14 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/leads` | Authenticated | List leads | `admin/leads/items.ts` |
| POST | `/api/admin/leads` | Authenticated | Create lead | `admin/leads/items.ts` |
| DELETE | `/api/admin/leads/:id` | Authenticated | Delete lead | `admin/leads/items.ts` |
| GET | `/api/admin/leads/:id` | Authenticated | Get lead by id | `admin/leads/items.ts` |
| PATCH | `/api/admin/leads/:id` | Authenticated | Update lead | `admin/leads/items.ts` |
| GET | `/api/admin/leads/:id/activities` | Authenticated | Get activitie activities | `admin/leads/items.ts` |
| POST | `/api/admin/leads/:id/assign` | Authenticated | Run assign action (assign) | `admin/leads/items.ts` |
| GET | `/api/admin/leads/:id/notes` | Authenticated | Get note notes | `admin/leads/notes.ts` |
| POST | `/api/admin/leads/:id/notes` | Authenticated | Run note action (notes) | `admin/leads/notes.ts` |
| DELETE | `/api/admin/leads/:id/notes/:noteId` | Authenticated | Delete note | `admin/leads/notes.ts` |
| PATCH | `/api/admin/leads/:id/notes/:noteId` | Authenticated | Update note | `admin/leads/notes.ts` |
| POST | `/api/admin/leads/:id/status` | Authenticated | Run statu action (status) | `admin/leads/items.ts` |
| GET | `/api/admin/leads/follow-up` | Authenticated | List follow-up | `admin/leads/items.ts` |
| GET | `/api/admin/leads/stats` | Authenticated | List stats | `admin/leads/items.ts` |

## media (15 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/media` | Authenticated | List media | `admin/media/items.ts` |
| DELETE | `/api/admin/media/:id` | Authenticated | Delete media | `admin/media/items.ts` |
| GET | `/api/admin/media/:id` | Authenticated | Get media by id | `admin/media/items.ts` |
| PATCH | `/api/admin/media/:id` | Public (no auth) | Update media | `admin/media/items.ts` |
| PUT | `/api/admin/media/:id` | Public (no auth) | Update media | `admin/media/items.ts` |
| GET | `/api/admin/media/:id/download` | Authenticated | Get download download | `admin/media/items.ts` |
| POST | `/api/admin/media/:id/restore` | Authenticated | Run restore action (restore) | `admin/media/items.ts` |
| GET | `/api/admin/media/folders` | Authenticated | List folders | `admin/media/folders.ts` |
| POST | `/api/admin/media/folders` | Authenticated | Create folder | `admin/media/folders.ts` |
| DELETE | `/api/admin/media/folders/:id` | Authenticated | Delete folder | `admin/media/folders.ts` |
| GET | `/api/admin/media/folders/:id` | Authenticated | Get folder by id | `admin/media/folders.ts` |
| PATCH | `/api/admin/media/folders/:id` | Public (no auth) | Update folder | `admin/media/folders.ts` |
| PUT | `/api/admin/media/folders/:id` | Public (no auth) | Update folder | `admin/media/folders.ts` |
| POST | `/api/admin/media/upload` | Authenticated | Create upload | `admin/media/items.ts` |
| GET | `/api/admin/media/usage/:id` | Authenticated | Get usage by id | `admin/media/items.ts` |

## portal (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/portal/sessions` | Authenticated | List sessions | `admin/portal.ts` |
| GET | `/api/admin/portal/sessions/:id` | Authenticated | Get session by id | `admin/portal.ts` |
| POST | `/api/admin/portal/sessions/:id/disable` | Authenticated | Run disable action (disable) | `admin/portal.ts` |
| POST | `/api/admin/portal/sessions/:id/regenerate-token` | Authenticated | Run regenerate-token action (regenerate-token) | `admin/portal.ts` |

## products (5 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/products` | Authenticated | List products | `admin/products.ts` |
| POST | `/api/admin/products` | Authenticated | Create product | `admin/products.ts` |
| DELETE | `/api/admin/products/:id` | Authenticated | Delete product | `admin/products.ts` |
| GET | `/api/admin/products/:id` | Authenticated | Get product by id | `admin/products.ts` |
| PATCH | `/api/admin/products/:id` | Authenticated | Update product | `admin/products.ts` |

## profile (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/profile` | Authenticated | List profile | `admin/profile.ts` |
| PUT | `/api/admin/profile` | Authenticated | Update profile | `admin/profile.ts` |
| GET | `/api/admin/profile/designations` | Authenticated | List designations | `admin/profile.ts` |
| PUT | `/api/admin/profile/designations` | Authenticated | Update designation | `admin/profile.ts` |

## proposals (16 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/proposals/documents` | Authenticated | List documents | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents` | Authenticated | Create document | `admin/proposals/documents.ts` |
| DELETE | `/api/admin/proposals/documents/:id` | Authenticated | Delete document | `admin/proposals/documents.ts` |
| GET | `/api/admin/proposals/documents/:id` | Authenticated | Get document by id | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents/:id/accept` | Authenticated | Run accept action (accept) | `admin/proposals/documents.ts` |
| GET | `/api/admin/proposals/documents/:id/pdf` | Public (no auth) | Get pdf pdf | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents/:id/pdf` | Public (no auth) | Generate pdf PDF | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents/:id/reject` | Authenticated | Run reject action (reject) | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents/:id/send` | Authenticated | Run send action (send) | `admin/proposals/documents.ts` |
| POST | `/api/admin/proposals/documents/:id/version` | Authenticated | Run version action (version) | `admin/proposals/documents.ts` |
| GET | `/api/admin/proposals/documents/:id/versions` | Authenticated | Get version versions | `admin/proposals/documents.ts` |
| GET | `/api/admin/proposals/templates` | Authenticated | List templates | `admin/proposals/templates.ts` |
| POST | `/api/admin/proposals/templates` | Authenticated | Create template | `admin/proposals/templates.ts` |
| DELETE | `/api/admin/proposals/templates/:id` | Authenticated | Delete template | `admin/proposals/templates.ts` |
| GET | `/api/admin/proposals/templates/:id` | Authenticated | Get template by id | `admin/proposals/templates.ts` |
| PUT | `/api/admin/proposals/templates/:id` | Authenticated | Update template | `admin/proposals/templates.ts` |

## releases (17 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/releases` | Authenticated | List releases | `admin/releases/items.ts` |
| POST | `/api/admin/releases` | Authenticated | Create release | `admin/releases/items.ts` |
| DELETE | `/api/admin/releases/:id` | Authenticated | Delete release | `admin/releases/items.ts` |
| GET | `/api/admin/releases/:id` | Authenticated | Get release by id | `admin/releases/items.ts` |
| PATCH | `/api/admin/releases/:id` | Authenticated | Update release | `admin/releases/items.ts` |
| GET | `/api/admin/releases/:id/lyrics` | Authenticated | Get lyric lyrics | `admin/releases/lyrics.ts` |
| PUT | `/api/admin/releases/:id/lyrics` | Authenticated | Update lyric | `admin/releases/lyrics.ts` |
| GET | `/api/admin/releases/:id/platforms` | Authenticated | Get platform platforms | `admin/releases/platforms.ts` |
| POST | `/api/admin/releases/:id/platforms` | Authenticated | Run platform action (platforms) | `admin/releases/platforms.ts` |
| DELETE | `/api/admin/releases/:id/platforms/:platformId` | Authenticated | Delete platform | `admin/releases/platforms.ts` |
| PATCH | `/api/admin/releases/:id/platforms/:platformId` | Authenticated | Update platform | `admin/releases/platforms.ts` |
| DELETE | `/api/admin/releases/:id/timeline` | Authenticated | Delete timeline | `admin/releases/timeline.ts` |
| GET | `/api/admin/releases/:id/timeline` | Authenticated | Get timeline timeline | `admin/releases/timeline.ts` |
| POST | `/api/admin/releases/:id/timeline` | Authenticated | Run timeline action (timeline) | `admin/releases/timeline.ts` |
| DELETE | `/api/admin/releases/:id/videos` | Authenticated | Delete video | `admin/releases/videos.ts` |
| GET | `/api/admin/releases/:id/videos` | Authenticated | Get video videos | `admin/releases/videos.ts` |
| POST | `/api/admin/releases/:id/videos` | Authenticated | Run video action (videos) | `admin/releases/videos.ts` |

## revisions (2 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/revisions` | Authenticated | List revisions | `admin/revisions.ts` |
| POST | `/api/admin/revisions/:id/restore` | Authenticated | Run restore action (restore) | `admin/revisions.ts` |

## search (7 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/search` | Public (no auth) | List search | `admin/search/main.ts` |
| GET | `/api/admin/search/analytics` | Authenticated | List analytics | `admin/search/main.ts` |
| GET | `/api/admin/search/synonyms` | Authenticated | List synonyms | `admin/search/synonyms.ts` |
| POST | `/api/admin/search/synonyms` | Authenticated | Create synonym | `admin/search/synonyms.ts` |
| DELETE | `/api/admin/search/synonyms/:id` | Authenticated | Delete synonym | `admin/search/synonyms.ts` |
| PATCH | `/api/admin/search/synonyms/:id` | Authenticated | Update synonym | `admin/search/synonyms.ts` |
| GET | `/api/admin/seo/validate` | Authenticated | List validate | `admin/search/main.ts` |

## seo (10 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/seo/meta` | Authenticated | List meta | `admin/seo.ts` |
| POST | `/api/admin/seo/meta` | Authenticated | Create meta | `admin/seo.ts` |
| DELETE | `/api/admin/seo/meta/:id` | Authenticated | Delete meta | `admin/seo.ts` |
| GET | `/api/admin/seo/meta/:id` | Authenticated | Get meta by id | `admin/seo.ts` |
| PUT | `/api/admin/seo/meta/:id` | Authenticated | Update meta | `admin/seo.ts` |
| GET | `/api/admin/seo/redirects` | Authenticated | List redirects | `admin/seo.ts` |
| POST | `/api/admin/seo/redirects` | Authenticated | Create redirect | `admin/seo.ts` |
| DELETE | `/api/admin/seo/redirects/:id` | Authenticated | Delete redirect | `admin/seo.ts` |
| GET | `/api/admin/seo/redirects/:id` | Authenticated | Get redirect by id | `admin/seo.ts` |
| PUT | `/api/admin/seo/redirects/:id` | Authenticated | Update redirect | `admin/seo.ts` |

## settings (21 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/settings/availability` | Authenticated | List availability | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/availability` | Authenticated | Update availability | `admin/settings/values.ts` |
| GET | `/api/admin/settings/default-language` | Authenticated | List default-language | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/default-language` | Authenticated | Update default-language | `admin/settings/values.ts` |
| GET | `/api/admin/settings/favicon` | Authenticated | List favicon | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/favicon` | Authenticated | Update favicon | `admin/settings/values.ts` |
| GET | `/api/admin/settings/hero-portrait` | Authenticated | List hero-portrait | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/hero-portrait` | Authenticated | Update hero-portrait | `admin/settings/values.ts` |
| GET | `/api/admin/settings/integrations` | Authenticated | List integrations | `admin/settings/integrations.ts` |
| POST | `/api/admin/settings/integrations` | Authenticated | Create integration | `admin/settings/integrations.ts` |
| DELETE | `/api/admin/settings/integrations/:id` | Authenticated | Delete integration | `admin/settings/integrations.ts` |
| GET | `/api/admin/settings/integrations/:id` | Authenticated | Get integration by id | `admin/settings/integrations.ts` |
| PATCH | `/api/admin/settings/integrations/:id` | Public (no auth) | Update integration | `admin/settings/integrations.ts` |
| PUT | `/api/admin/settings/integrations/:id` | Public (no auth) | Update integration | `admin/settings/integrations.ts` |
| POST | `/api/admin/settings/integrations/:id/regenerate` | Authenticated | Run regenerate action (regenerate) | `admin/settings/integrations.ts` |
| GET | `/api/admin/settings/primary-identity` | Authenticated | List primary-identity | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/primary-identity` | Authenticated | Update primary-identity | `admin/settings/values.ts` |
| GET | `/api/admin/settings/search-indexing` | Authenticated | List search-indexing | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/search-indexing` | Authenticated | Update search-indexing | `admin/settings/values.ts` |
| GET | `/api/admin/settings/site-copy` | Authenticated | List site-copy | `admin/settings/values.ts` |
| PUT | `/api/admin/settings/site-copy` | Authenticated | Update site-copy | `admin/settings/values.ts` |

## timeline (4 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/timeline-events` | Authenticated | List timeline-events | `admin/timeline.ts` |
| POST | `/api/admin/timeline-events` | Authenticated | Create timeline-event | `admin/timeline.ts` |
| DELETE | `/api/admin/timeline-events/:id` | Authenticated | Delete timeline-event | `admin/timeline.ts` |
| PUT | `/api/admin/timeline-events/:id` | Authenticated | Update timeline-event | `admin/timeline.ts` |

## users (1 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/users` | Authenticated | List users | `admin/users.ts` |

## ventures (19 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/ventures` | Authenticated | List ventures | `admin/ventures/items.ts` |
| POST | `/api/admin/ventures` | Authenticated | Create venture | `admin/ventures/items.ts` |
| DELETE | `/api/admin/ventures/:id` | Authenticated | Delete venture | `admin/ventures/items.ts` |
| GET | `/api/admin/ventures/:id` | Authenticated | Get venture by id | `admin/ventures/items.ts` |
| PATCH | `/api/admin/ventures/:id` | Authenticated | Update venture | `admin/ventures/items.ts` |
| GET | `/api/admin/ventures/:id/categories` | Authenticated | Get categorie categories | `admin/ventures/categories.ts` |
| POST | `/api/admin/ventures/:id/categories` | Authenticated | Run categorie action (categories) | `admin/ventures/categories.ts` |
| DELETE | `/api/admin/ventures/:id/media` | Authenticated | Delete media | `admin/ventures/media.ts` |
| GET | `/api/admin/ventures/:id/media` | Authenticated | Get media media | `admin/ventures/media.ts` |
| PATCH | `/api/admin/ventures/:id/media` | Authenticated | Update media | `admin/ventures/media.ts` |
| POST | `/api/admin/ventures/:id/media` | Authenticated | Run media action (media) | `admin/ventures/media.ts` |
| GET | `/api/admin/ventures/:id/products` | Authenticated | Get product products | `admin/ventures/items.ts` |
| DELETE | `/api/admin/ventures/:id/timeline` | Authenticated | Delete timeline | `admin/ventures/timeline.ts` |
| GET | `/api/admin/ventures/:id/timeline` | Authenticated | Get timeline timeline | `admin/ventures/timeline.ts` |
| POST | `/api/admin/ventures/:id/timeline` | Authenticated | Run timeline action (timeline) | `admin/ventures/timeline.ts` |
| GET | `/api/admin/ventures/categories` | Authenticated | List categories | `admin/ventures/categories.ts` |
| POST | `/api/admin/ventures/categories` | Authenticated | Create categorie | `admin/ventures/categories.ts` |
| DELETE | `/api/admin/ventures/categories/:id` | Authenticated | Delete categorie | `admin/ventures/categories.ts` |
| PATCH | `/api/admin/ventures/categories/:id` | Authenticated | Update categorie | `admin/ventures/categories.ts` |

## workflows (10 routes)

| Method | Path | Auth | What it does | File |
|---|---|---|---|---|
| GET | `/api/admin/workflows` | Authenticated | List workflows | `admin/workflows/crud.ts` |
| POST | `/api/admin/workflows` | Authenticated | Create workflow | `admin/workflows/crud.ts` |
| DELETE | `/api/admin/workflows/:id` | Authenticated | Delete workflow | `admin/workflows/crud.ts` |
| GET | `/api/admin/workflows/:id` | Authenticated | Get workflow by id | `admin/workflows/crud.ts` |
| PATCH | `/api/admin/workflows/:id` | Authenticated | Update workflow | `admin/workflows/crud.ts` |
| POST | `/api/admin/workflows/process` | Authenticated | Create proces | `admin/workflows/triggers.ts` |
| GET | `/api/admin/workflows/runs` | Authenticated | List runs | `admin/workflows/runs.ts` |
| GET | `/api/admin/workflows/runs/:id` | Authenticated | Get run by id | `admin/workflows/runs.ts` |
| POST | `/api/admin/workflows/runs/:id/retry` | Authenticated | Run retry action (retry) | `admin/workflows/runs.ts` |
| POST | `/api/admin/workflows/trigger-test` | Authenticated | Create trigger-test | `admin/workflows/triggers.ts` |
