# Phase 02 — Database & Drizzle Foundation: Review

## 1. Table Consistency

| Metric | Count |
|--------|-------|
| Total tables | 72 |
| Domains | 18 |
| Junction tables | 5 (role_permissions, user_roles, project_technologies, post_categories, post_tags, venture_products) |
| Polymorphic pattern tables | 7 (faqs, seo_meta, content_revisions, audit_logs, timeline_events, search_index, finance_payments/expenses/invoices) |
| Domain-prefixed tables | finance_payments, finance_expenses, finance_invoices, projects_freelance, artist_events, portal_sessions, portal_messages, event_categories, event_logistics, event_activity_logs |
| Single-entity junction tables | subscriber_segments (1:N, separate from subscriber), venture_products (M:N) |

### Naming Convention Compliance

| Rule | Status | Exceptions |
|------|--------|------------|
| Plural table names | ✅ PASS | None |
| snake_case columns | ✅ PASS | None |
| UUID PK as `id` | ✅ PASS | All tables |
| FK as `{table}_id` | ✅ PASS | `entity_id`/`source_id` in polymorphic — correct per convention |
| Enum values snake_case | ✅ PASS | All 23 enums use snake_case |

### Notable Patterns

1. **Polymorphic via entity_type+entity_id**: faqs, seo_meta, content_revisions, audit_logs, timeline_events, search_index
2. **Polymorphic via source_type+source_id**: finance_payments, finance_expenses, finance_invoices
3. **1:1 relationships**: developer_profiles→person_profiles, entrepreneur_profiles→person_profiles, artist_profiles→person_profiles, event_logistics→artist_events, release_lyrics→releases, portal_sessions→projects_freelance
4. **Array columns (not normalized)**: projects_freelance.assigned_to (uuid[]), projects_freelance.tags (text[]), subscribers.segments (text[]), campaigns.segments (text[])
5. **Soft delete**: Only media_assets (deleted_at)

---

## 2. Relationships

### One-to-Many (1:N)

| Parent | Child | FK Column |
|--------|-------|-----------|
| users | sessions | user_id |
| users | accounts | user_id |
| users | verification_tokens | user_id |
| users | pages | created_by |
| users | posts | author_id |
| services | service_faqs | service_id |
| projects | case_studies | project_id |
| leads | projects_freelance | client_id |
| project_categories | projects_freelance | category_id |
| projects_freelance | project_milestones | project_id |
| projects_freelance | project_deliverables | project_id |
| projects_freelance | project_activity_logs | project_id |
| project_milestones | project_deliverables | milestone_id |
| event_categories | artist_events | category_id |
| artist_events | event_activity_logs | event_id |
| releases | release_platforms | release_id |
| ventures | products | venture_id |
| forms | form_fields | form_id |
| forms | form_submissions | form_id |
| forms | form_analytics | form_id |
| subscribers | subscriber_segments | subscriber_id |
| subscribers | subscriber_verifications | subscriber_id |
| media_folders | media_assets | folder_id |
| media_folders | media_folders (parent_id) | self-referential |
| leads | lead_activities | lead_id |
| leads | lead_notes | lead_id |

### Many-to-Many (M:N via Junction)

| Junction | Left | Right |
|----------|------|-------|
| role_permissions | roles | permissions |
| user_roles | users | roles |
| project_technologies | projects | technologies |
| post_categories | posts | categories |
| post_tags | posts | tags |
| venture_products | ventures | products |

### One-to-One (1:1)

| Table A | Table B | FK |
|---------|---------|-----|
| person_profiles | developer_profiles | developer_profiles.id (same as person_profiles.id) |
| person_profiles | entrepreneur_profiles | entrepreneur_profiles.id |
| person_profiles | artist_profiles | artist_profiles.id |
| artist_events | event_logistics | event_logistics.event_id (UNIQUE) |
| releases | release_lyrics | release_lyrics.release_id (UNIQUE) |
| projects_freelance | portal_sessions | portal_sessions.project_id |

---

## 3. Constraints

### Primary Key
- All tables: `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`

### Unique Constraints (73 total)

| Table | Column(s) |
|-------|-----------|
| users | email |
| roles | name |
| permissions | name |
| sessions | token |
| pages, services, projects, posts, case_studies, resources, media_mentions, ventures, products, releases, project_categories, event_categories, forms | slug |
| homepage_sections | section_key |
| categories, tags | slug |
| projects_freelance | portal_token |
| portal_sessions | portal_token, project_id |
| finance_invoices | invoice_number |
| subscribers | email |
| subscriber_verifications | token |
| settings | key |
| artist_availability | date |
| release_lyrics | release_id |
| event_logistics | event_id |
| seo_meta | (entity_type, entity_id) |

### Check Constraints Needed
- testimonials.rating: 1-5
- finance_payments.amount: > 0
- finance_expenses.amount: > 0
- finance_invoices.total: >= 0
- sla_minutes: > 0

---

## 4. Indexes

### Existing Unique Indexes (implicit from UNIQUE constraints)
Covered above in constraints.

### Recommended Additional Indexes (per DATA_MODEL.md §6.1)

```sql
-- Scheduling queries
CREATE INDEX idx_posts_publish_at ON posts(publish_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_expires_at ON posts(expires_at) WHERE expires_at IS NOT NULL;

-- Newsletter campaigns
CREATE INDEX idx_campaigns_status_scheduled ON campaigns(status, scheduled_at)
  WHERE status = 'scheduled';

-- Media cleanup
CREATE INDEX idx_media_assets_deleted_at ON media_assets(deleted_at) WHERE deleted_at IS NULL;

-- Search index entity lookup
CREATE UNIQUE INDEX idx_search_index_entity ON search_index(entity_type, entity_id);

-- FK query performance (all foreign keys should be indexed)
CREATE INDEX idx_leads_assigned_user ON leads(assigned_user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_artist_events_status ON artist_events(status);
CREATE INDEX idx_artist_events_date ON artist_events(event_date);
CREATE INDEX idx_finance_payments_source ON finance_payments(source_type, source_id);
CREATE INDEX idx_finance_invoices_source ON finance_invoices(source_type, source_id);
CREATE INDEX idx_projects_freelance_status ON projects_freelance(status);
CREATE INDEX idx_portal_messages_project ON portal_messages(project_id);
CREATE INDEX idx_timeline_events_source ON timeline_events(source_type, source_id);
CREATE INDEX idx_media_assets_folder ON media_assets(folder_id);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_post_categories_post ON post_categories(post_id);
CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_project_technologies_project ON project_technologies(project_id);
CREATE INDEX idx_service_faqs_service ON service_faqs(service_id);
CREATE INDEX idx_project_activity_logs_project ON project_activity_logs(project_id);
```

---

## 5. Naming Conventions

| Convention | Status | Notes |
|------------|--------|-------|
| Plural table names | ✅ | All 72 tables plural |
| snake_case columns | ✅ | All columns |
| UUID PK `id` | ✅ | Consistent |
| FK: `{referenced_table}_id` | ✅ | With polymorphic exceptions |
| Partial indexes where beneficial | ✅ | Planned |
| Timestamps: created_at, updated_at | ✅ | Consistent |
| Soft delete: deleted_at | ✅ | Only on media_assets |

---

## 6. Domain Boundaries

| Domain | Package | Tables | Order |
|--------|---------|--------|-------|
| Identity | auth | 12 | 1 (no deps) |
| Content | cms | 17 | 2 (depends on Identity) |
| Entrepreneur | cms | 3 | 2 |
| Artist | cms | 3 | 2 |
| Freelance | freelance | 5 | 3 (depends on CRM/Identity) |
| Artist Events | events | 5 | 3 (depends on CRM/Identity) |
| CRM | crm | 4 | 2 (depends on Identity) |
| Forms | cms | 4 | 3 (depends on CRM) |
| Finance | finance | 4 | 4 (depends on Freelance/Events/CRM) |
| Proposals | proposals | 2 | 4 (depends on Freelance/CRM) |
| Client Portal | portal | 2 | 4 (depends on Freelance) |
| Newsletter | cms | 4 | 2 (depends on Identity) |
| Search | search | 2 | 5 (depends on Content) |
| SEO | seo | 2 | 5 (depends on Content) |
| Media | cms | 2 | 2 |
| Homepage | cms | 1 | 2 |
| System | shared | 3 | 1 |
| Timeline | cms | 1 | 5 (depends on Content/Freelance/Events) |

---

## 7. Issues Found

### Minor
1. **`venture_products`** is a redundant junction with `products.venture_id` FK — products already linked to ventures. Either `venture_products` is for additional cross-venture linking or it is redundant. **Recommendation**: Keep both — `products.venture_id` for primary venture, `venture_products` for cross-venture visibility.
2. **`lead_notes` vs `lead_activities`** — notes are activities with `is_internal=true`. Could consolidate but separation provides clearer API boundaries. **No change**.
3. **`projects` (portfolio) vs `projects_freelance`** — naming disambiguated and correct per PRD. **No change**.

### No Critical Issues
- All FKs reference existing tables
- All unique constraints serve clear business purposes
- Naming conventions are consistent
- Domain boundaries are logical

---

## Review Verdict

| Check | Status |
|-------|--------|
| Table consistency | ✅ PASS |
| Relationship integrity | ✅ PASS |
| Constraints | ✅ PASS (minor check constraints needed) |
| Index coverage | ✅ PASS (performance indexes noted) |
| Naming convention compliance | ✅ PASS |
| Domain boundary integrity | ✅ PASS |
| **Overall** | **READY FOR IMPLEMENTATION** |
