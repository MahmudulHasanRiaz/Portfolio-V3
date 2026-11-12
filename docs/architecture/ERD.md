# Entity Relationship Diagram (Textual)

> **PRD Reference:** [PRD.md](../PRD.md) — Database Architecture, Identity Architecture, All Feature Specifications  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Identity Domain

```
person_profiles 1────1 developer_profiles
person_profiles 1────1 entrepreneur_profiles
person_profiles 1────1 artist_profiles

users 1────N user_roles N────1 roles N────N role_permissions N────N permissions
users 1────N sessions
users 1────N accounts
users 1────N verification_tokens
```

## 2. Content Domain

```
pages (self-contained)
homepage_sections (self-contained)

services 1────N service_faqs
services N────N faqs (polymorphic: entity_type='service')

projects 1────N project_technologies N────N technologies
projects 1────N faqs (polymorphic)
projects N────N case_studies (1 project : N case studies)

posts N────N post_categories N────N categories
posts N────N post_tags N────N tags
posts 1────N faqs (polymorphic)
posts N────1 users (author)

resources 1────N faqs (polymorphic)

media_mentions (self-contained)

testimonials ──── projects_freelance (optional FK)
testimonials ──── artist_events (optional FK)

media_assets N────1 media_folders
```

## 3. Entrepreneur Domain

```
ventures 1────N products
ventures 1────N faqs (polymorphic)
```

## 4. Artist Domain

```
releases 1────N release_platforms
releases 1────1 release_lyrics
releases 1────N faqs (polymorphic)
```

## 5. CRM Domain

```
leads 1────N lead_activities
leads 1────N lead_notes
leads 1────N projects_freelance (conversion)
leads 1────N artist_events (conversion)
abandoned_leads (self-contained)
```

## 6. Freelance Projects Domain

```
projects_freelance N────1 project_categories
projects_freelance N────1 leads (client_id)
projects_freelance 1────N project_milestones
projects_freelance 1────N project_deliverables ──── project_milestones (optional FK)
projects_freelance 1────N project_activity_logs
projects_freelance 1────1 portal_sessions
projects_freelance 1────N portal_messages
projects_freelance N────N users (assigned_to — array field, not normalized)
projects_freelance 1────N testimonials (optional FK)
```

## 7. Artist Events Domain

```
artist_events N────1 event_categories
artist_events N────1 leads (organizer_id — optional FK)
artist_events 1────1 event_logistics
artist_events 1────N event_activity_logs
artist_events 1────N testimonials (optional FK)
artist_availability (self-contained, unique per date)
```

## 8. Finance Domain

```
payment_methods (self-contained)

finance_payments N────1 payment_methods
finance_payments N────1 leads (client_id)
finance_payments N────1 finance_invoices (optional FK)
finance_payments ———→ projects_freelance (polymorphic: source_type='freelance_project', source_id)
finance_payments ———→ artist_events (polymorphic: source_type='artist_event', source_id)

finance_expenses N────1 payment_methods
finance_expenses ———→ projects_freelance (polymorphic)
finance_expenses ———→ artist_events (polymorphic)
finance_expenses ———→ general (no source_id)

finance_invoices N────1 leads (client_id)
finance_invoices ———→ projects_freelance (polymorphic)
finance_invoices ———→ artist_events (polymorphic)
```

## 9. Client Portal Domain

```
portal_sessions N────1 projects_freelance (unique per project)
portal_messages N────1 projects_freelance
```

## 10. Proposals Domain

```
proposal_templates N────1 project_categories
proposal_documents N────1 proposal_templates
proposal_documents N────1 projects_freelance
proposal_documents N────1 leads
```

## 11. Forms Domain

```
forms 1────N form_fields
forms 1────N form_submissions ──── leads (optional FK on lead creation)
forms 1────N form_analytics
```

## 12. Newsletter Domain

```
subscribers 1────N subscriber_segments
subscribers 1────N subscriber_verifications
campaigns (self-contained — segments stored as array)
```

## 13. Search Domain

```
search_index ———→ all content entities (polymorphic: entity_type + entity_id)
search_synonyms (self-contained)
```

## 14. SEO Domain

```
seo_meta ———→ all SEO entities (polymorphic: entity_type + entity_id)
slug_redirects (self-contained)
```

## 15. System Domain

```
settings (self-contained — key-value store)
audit_logs ———→ all entities (polymorphic)
content_revisions ———→ all content entities (polymorphic)
```

## 16. Timeline Domain

```
timeline_events ———→ projects, ventures, releases, milestones, media_mentions (polymorphic)
```

---

## 17. Polymorphic Relationship Legend

| Pattern | Implementation | Example Tables |
|---------|---------------|----------------|
| `entity_type` + `entity_id` | Two columns: `entity_type VARCHAR(50)`, `entity_id UUID` | faqs, seo_meta, content_revisions, audit_logs, timeline_events, search_index |
| `source_type` + `source_id` | Two columns with enum for source | finance_payments, finance_expenses, finance_invoices |

---

## 18. Complete Entity Count

| Domain | Tables | Relationships |
|--------|--------|---------------|
| Identity | 12 | 6 FK relationships |
| Content | 18 | 12 FK relationships |
| Entrepreneur | 3 | 1 FK relationship |
| Artist | 3 | 2 FK relationships |
| CRM | 4 | 2 FK relationships |
| Freelance Projects | 6 | 6 FK relationships |
| Artist Events | 5 | 4 FK relationships |
| Finance | 4 | 8 FK relationships (including polymorphic) |
| Client Portal | 2 | 1 FK relationship |
| Proposals | 2 | 3 FK relationships |
| Forms | 4 | 1 FK relationship |
| Newsletter | 4 | 1 FK relationship |
| Search | 2 | 0 FK (polymorphic only) |
| SEO | 2 | 0 FK (polymorphic only) |
| System | 3 | 0 FK (polymorphic only) |
| Timeline | 1 | 0 FK (polymorphic only) |
| **Total** | **72** | **47 FK + polymorphic** |
