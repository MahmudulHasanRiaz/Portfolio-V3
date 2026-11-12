# Phase 02 — Implementation Plan

## Database Dependency Graph

```
Layer 0 (No Dependencies)
├── Identity Domain: users, roles, permissions, sessions, accounts, verification_tokens → 6 tables
├── System Domain: settings, audit_logs, content_revisions → 3 tables
│
Layer 1 (Depends on Identity)
├── Identity Domain: role_permissions, user_roles, person_profiles, developer_profiles,
│   entrepreneur_profiles, artist_profiles → 6 tables
├── Media Domain: media_folders, media_assets → 2 tables
│
Layer 2 (Depends on Identity + Media)
├── Content Domain: pages, homepage_sections, services, projects, technologies, posts,
│   categories, tags, resources, faqs, testimonials → 11 tables
├── Entrepreneur Domain: ventures, products → 2 tables
├── Artist Domain: releases → 1 table
├── CRM Domain: leads, abandoned_leads → 2 tables
├── Newsletter Domain: subscribers, subscriber_verifications → 2 tables
│
Layer 3 (Depends on Content + Identity)
├── Content Domain: service_faqs, project_technologies, case_studies, post_categories,
│   post_tags, media_mentions, homepage_versions → 7 tables
├── Artist Domain: release_platforms, release_lyrics → 2 tables
├── Entrepreneur Domain: venture_products → 1 table
├── Newsletter Domain: subscriber_segments, campaigns → 2 tables
├── Forms Domain: forms → 1 table
├── Search Domain: search_index, search_synonyms → 2 tables
├── SEO Domain: seo_meta, slug_redirects → 2 tables
├── Timeline Domain: timeline_events → 1 table
│
Layer 4 (Depends on CRM + Identity + Content)
├── Freelance Domain: project_categories, projects_freelance, project_milestones,
│   project_deliverables, project_activity_logs → 5 tables
├── Events Domain: event_categories, artist_events, event_logistics,
│   event_activity_logs, artist_availability → 5 tables
├── Forms Domain: form_fields, form_submissions, form_analytics → 3 tables
│
Layer 5 (Depends on Freelance + Events + CRM + Identity)
├── Finance Domain: payment_methods, finance_payments, finance_expenses,
│   finance_invoices → 4 tables
├── Proposals Domain: proposal_templates, proposal_documents → 2 tables
├── Portal Domain: portal_sessions, portal_messages → 2 tables
```

**Total: 72 tables across 6 layers → 8 migration batches**

---

## Migration Order (8 Batches)

| Batch | Tables | Dependencies |
|-------|--------|--------------|
| M001 | users, roles, permissions, sessions, accounts, verification_tokens, settings, audit_logs, content_revisions | None |
| M002 | role_permissions, user_roles, media_folders, media_assets | M001 |
| M003 | person_profiles, developer_profiles, entrepreneur_profiles, artist_profiles, pages, homepage_sections, services, projects, technologies, posts, categories, tags, resources, faqs, testimonials, ventures, products, releases, leads, abandoned_leads, subscribers, subscriber_verifications | M001, M002 |
| M004 | service_faqs, project_technologies, case_studies, post_categories, post_tags, media_mentions, homepage_versions, release_platforms, release_lyrics, venture_products, subscriber_segments, campaigns, forms, search_index, search_synonyms, seo_meta, slug_redirects, timeline_events | M003 |
| M005 | project_categories, projects_freelance, project_milestones, project_deliverables, project_activity_logs, event_categories, artist_events, event_logistics, event_activity_logs, artist_availability, form_fields, form_submissions, form_analytics | M004 |
| M006 | payment_methods, finance_payments, finance_expenses, finance_invoices, proposal_templates, proposal_documents, portal_sessions, portal_messages | M005 |

---

## Schema Generation Plan

### Implementation Strategy

```
packages/database/
├── src/
│   ├── index.ts                  # Re-exports
│   ├── connection.ts             # Drizzle client + pool config
│   ├── config.ts                 # Database config types + env validation
│   ├── errors.ts                 # DatabaseError class
│   ├── utils/
│   │   ├── index.ts
│   │   ├── transaction.ts        # Transaction helper
│   │   └── query-timing.ts       # Query duration tracking
│   ├── schema/
│   │   ├── index.ts              # Re-exports all schemas
│   │   ├── enums.ts              # All 23 enums
│   │   ├── identity/             # 12 tables, 6 files
│   │   ├── content/              # 17 tables, 11 files
│   │   ├── entrepreneur/         # 3 tables, 3 files
│   │   ├── artist/               # 3 tables, 3 files
│   │   ├── freelance/            # 5 tables, 5 files
│   │   ├── events/               # 5 tables, 5 files
│   │   ├── finance/              # 4 tables, 4 files
│   │   ├── portal/               # 2 tables, 2 files
│   │   ├── proposals/            # 2 tables, 2 files
│   │   ├── crm/                  # 4 tables, 4 files
│   │   ├── forms/                # 4 tables, 3 files
│   │   ├── newsletter/           # 4 tables, 3 files
│   │   ├── search/               # 2 tables, 2 files
│   │   ├── seo/                  # 2 tables, 2 files
│   │   ├── media/                # 2 tables, 2 files
│   │   ├── system/               # 3 tables, 3 files
│   │   └── timeline/             # 1 table, 1 file
│   ├── relations/
│   │   ├── index.ts              # Re-exports all relations
│   │   └── *.ts                  # Relations per domain
│   ├── repository/
│   │   ├── index.ts
│   │   ├── base.ts               # BaseRepository class
│   │   └── *.ts                  # Repositories per domain
│   └── seed/
│       ├── index.ts              # Seed runner
│       ├── identity.ts           # Seed data for Identity domain
│       └── ...                   # Seed data per domain
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### File Count: Approximately 70 files

---

## Repository Ownership Plan

| Repository | Tables Covered | Layer |
|------------|---------------|-------|
| BaseRepository | Common CRUD + pagination + error handling | Framework |
| UserRepository | users, user_roles | Identity |
| RoleRepository | roles, role_permissions | Identity |
| PermissionRepository | permissions | Identity |
| SessionRepository | sessions | Identity |
| AccountRepository | accounts | Identity |
| VerificationTokenRepository | verification_tokens | Identity |
| PersonProfileRepository | person_profiles, developer_profiles, entrepreneur_profiles, artist_profiles | Identity |
| PageRepository | pages | Content |
| HomepageSectionRepository | homepage_sections | Content |
| ServiceRepository | services, service_faqs | Content |
| ProjectRepository | projects, project_technologies | Content |
| TechnologyRepository | technologies | Content |
| CaseStudyRepository | case_studies | Content |
| PostRepository | posts, post_categories, post_tags | Content |
| CategoryRepository | categories | Content |
| TagRepository | tags | Content |
| ResourceRepository | resources | Content |
| MediaMentionRepository | media_mentions | Content |
| FaqRepository | faqs | Content |
| TestimonialRepository | testimonials | Content |
| VentureRepository | ventures, venture_products | Entrepreneur |
| ProductRepository | products | Entrepreneur |
| ReleaseRepository | releases, release_platforms, release_lyrics | Artist |
| LeadRepository | leads | CRM |
| LeadActivityRepository | lead_activities | CRM |
| LeadNoteRepository | lead_notes | CRM |
| AbandonedLeadRepository | abandoned_leads | CRM |
| ProjectCategoryRepository | project_categories | Freelance |
| FreelanceProjectRepository | projects_freelance | Freelance |
| MilestoneRepository | project_milestones | Freelance |
| DeliverableRepository | project_deliverables | Freelance |
| ProjectActivityLogRepository | project_activity_logs | Freelance |
| EventCategoryRepository | event_categories | Events |
| ArtistEventRepository | artist_events | Events |
| EventLogisticsRepository | event_logistics | Events |
| EventActivityLogRepository | event_activity_logs | Events |
| AvailabilityRepository | artist_availability | Events |
| PaymentMethodRepository | payment_methods | Finance |
| PaymentRepository | finance_payments | Finance |
| ExpenseRepository | finance_expenses | Finance |
| InvoiceRepository | finance_invoices | Finance |
| PortalSessionRepository | portal_sessions | Portal |
| PortalMessageRepository | portal_messages | Portal |
| ProposalTemplateRepository | proposal_templates | Proposals |
| ProposalDocumentRepository | proposal_documents | Proposals |
| FormRepository | forms, form_fields, form_submissions, form_analytics | Forms |
| SubscriberRepository | subscribers, subscriber_segments, subscriber_verifications | Newsletter |
| CampaignRepository | campaigns | Newsletter |
| MediaAssetRepository | media_assets | Media |
| MediaFolderRepository | media_folders | Media |
| SettingRepository | settings | System |
| AuditLogRepository | audit_logs | System |
| ContentRevisionRepository | content_revisions | System |
| SearchIndexRepository | search_index | Search |
| SearchSynonymRepository | search_synonyms | Search |
| SeoMetaRepository | seo_meta | SEO |
| SlugRedirectRepository | slug_redirects | SEO |
| TimelineEventRepository | timeline_events | Timeline |
| HomepageVersionRepository | homepage_versions | Homepage |

**Total: ~55 repositories**

---

## Seed Data Plan

| Seed File | Data | Priority |
|-----------|------|----------|
| identity.ts | Admin user, 10 roles, 52 permissions, admin role-permissions | P0 - Required |
| content.ts | Sample: services, projects, blog post, case study | P1 - Dev |
| entrepreneur.ts | Sample: venture, 2 products | P1 - Dev |
| artist.ts | Sample: release with platform links and lyrics | P1 - Dev |
| crm.ts | Sample: leads in various pipeline stages | P1 - Dev |
| freelance.ts | Sample: freelance project with milestones, deliverables | P1 - Dev |
| events.ts | Sample: event categories, artist events | P1 - Dev |
| finance.ts | Sample: payment methods, payments, expenses | P2 - Nice |
| newsletter.ts | Sample: subscribers | P2 - Nice |
| settings.ts | Default system settings | P1 - Dev |

**Total seed files: 10**

---

## Execution Approach

Given the exFAT limitation (no workspace linking), Phase 02 schemas and code will be written as source files. Full compilation requires moving to NTFS, but the code can be validated structurally.

### Task Breakdown

| Task | Description | Est. Files |
|------|-------------|-----------|
| T2.1 | Configure Drizzle ORM (connection, config, errors, utilities) | 6 |
| T2.2 | Identity Domain schemas (12 tables, enums, relations) | 8 |
| T2.3 | Content Domain schemas (17 tables, relations) | 12 |
| T2.4 | Entrepreneur & Artist schemas (6 tables, relations) | 6 |
| T2.5 | CRM Domain schemas (4 tables, relations) | 4 |
| T2.6 | Freelance & Event schemas (10 tables, relations) | 10 |
| T2.7 | Finance & Portal schemas (6 tables, relations) | 6 |
| T2.8 | Proposals, Newsletter, Search schemas (10 tables, relations) | 8 |
| T2.9 | SEO, Media, System, Timeline schemas (8 tables, relations) | 8 |
| T2.10 | Repository Pattern (BaseRepository + all ~55 repos) | 56 |
| T2.11 | Seed Data (10 seed files) | 10 |
| T2.12 | Generate & Apply Migrations | 8 migration dirs |

---

## Agent Roles (from MULTI_AGENT_PLAN.md)

| Agent | Responsibility |
|-------|---------------|
| Database Architect | Schema design, relationships, constraints, indexes |
| Drizzle Agent | Drizzle schema definitions, drizzle.config, connection |
| Migration Agent | Migration generation and ordering |
| Repository Agent | Repository pattern implementation |
| Validation Agent | Schema validation, relation validation |
| Documentation Agent | Code documentation, README |
| Review Agent | Cross-check all agent outputs |

---

## Estimated Effort

- Schema definitions (all domains): ~50 files
- Relations definitions: ~18 files
- Repository implementations (Base + ~55): ~56 files
- Seed data: ~10 files
- Configuration + utilities: ~6 files
- Migration batches: ~8 directories

**Total: ~148 files**
**Estimated agent sessions: 10-14 (per MASTERPLAN)**
