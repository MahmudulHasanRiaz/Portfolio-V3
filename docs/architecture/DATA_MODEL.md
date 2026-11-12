# Data Model

> **PRD Reference:** [PRD.md](../PRD.md) — Database Architecture (§ Database Architecture), Identity Architecture, Feature Specifications  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Database Platform

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 16 |
| Initial Host | Supabase PostgreSQL |
| Future Host | Self-hosted PostgreSQL |
| ORM | Drizzle ORM |
| Pattern | Repository Pattern (mandatory — vendor lock-in prevention) |
| Migrations | Drizzle Kit |

**Rule:** No application code depends on Supabase-specific features. All access abstracted through repositories.

---

## 2. Domain Overview

| Domain | Tables | Package |
|--------|--------|---------|
| Identity | 12 | `auth`, `database` |
| Content | 18 | `cms` |
| Entrepreneur | 3 | `cms` |
| Artist | 3 | `cms` |
| Freelance Projects | 5 | `freelance` |
| Artist Events | 5 | `events` |
| Finance | 4 | `finance` |
| Client Portal | 2 | `portal` |
| Proposals | 2 | `proposals` |
| Timeline | 1 | `cms` |
| Search | 2 | `search` |
| Homepage | 1 | `cms` |
| CRM | 3 | `crm` |
| Forms | 4 | `cms` |
| Newsletter | 4 | `cms` |
| SEO | 2 | `seo` |
| Media | 2 | `cms` |
| System | 3 | `shared` |

---

## 3. Complete Entity Definitions

### 3.1 Identity Domain

#### `users`
| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| email | varchar(255) | UNIQUE, NOT NULL |
| email_verified | boolean | DEFAULT false |
| name | text | |
| avatar_url | text | |
| phone | varchar(50) | |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

#### `roles`
| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| name | varchar(100) | UNIQUE, NOT NULL |
| description | text | |
| is_system | boolean | DEFAULT false |
| created_at | timestamp | |

#### `permissions`
| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| name | varchar(100) | UNIQUE, NOT NULL (e.g., `create_post`, `manage_users`) |
| description | text | |
| group | varchar(50) | Logical grouping |
| created_at | timestamp | |

#### `role_permissions`
| Field | Type | Constraints |
|-------|------|-------------|
| role_id | uuid | FK → roles, PK composite |
| permission_id | uuid | FK → permissions, PK composite |

#### `user_roles`
| Field | Type | Constraints |
|-------|------|-------------|
| user_id | uuid | FK → users, PK composite |
| role_id | uuid | FK → roles, PK composite |

#### `sessions`
| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, NOT NULL |
| token | varchar(500) | UNIQUE, NOT NULL |
| expires_at | timestamp | NOT NULL |
| ip_address | varchar(45) | |
| user_agent | text | |
| created_at | timestamp | |

#### `accounts` (Better Auth)
| Field | Type |
|-------|------|
| id | uuid |
| user_id | uuid |
| provider | varchar(50) |
| provider_account_id | varchar(255) |
| access_token | text |
| refresh_token | text |
| expires_at | timestamp |

#### `verification_tokens`
| Field | Type |
|-------|------|
| id | uuid |
| user_id | uuid |
| token | varchar(500) |
| type | varchar(50) |
| expires_at | timestamp |
| created_at | timestamp |

#### `person_profiles`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| full_name | text | |
| headline | text | Professional headline |
| bio_short | text | Short biography |
| bio_long | text | Long-form biography |
| profile_image | text | URL |
| cover_image | text | URL |
| location | text | |
| email | text | Contact email |
| phone | text | |
| website | text | |
| resume_url | text | |
| press_kit_url | text | |
| social_links | jsonb | JSON — permanent JSON storage |
| streaming_links | jsonb | JSON — permanent JSON storage |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `developer_profiles`
| Field | Type |
|-------|------|
| id | uuid | PK, FK → person_profiles |
| years_experience | int | |
| skills | jsonb | Categorized skills |
| certifications | jsonb | |
| resume_text | text | |

#### `entrepreneur_profiles`
| Field | Type |
|-------|------|
| id | uuid | PK, FK → person_profiles |
| founder_story | text | |
| business_philosophy | text | |
| mission_statement | text | |
| vision_statement | text | |

#### `artist_profiles`
| Field | Type |
|-------|------|
| id | uuid | PK, FK → person_profiles |
| artist_name | text | |
| biography | text | |
| genre | text | |
| booking_info | text | |

---

### 3.2 Content Domain

#### `pages`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| content | text (rich) | |
| template | varchar(100) | |
| status | enum: draft, published, archived |
| locale | varchar(10) | For multi-language |
| translation_group | uuid | |
| meta_title | text | |
| meta_description | text | |
| og_image | text | |
| created_by | uuid | FK → users |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `homepage_sections`
| Field | Type |
|-------|------|
| id | uuid | PK |
| section_key | varchar(100) | UNIQUE (e.g., hero, trust_indicators) |
| is_visible | boolean | DEFAULT true |
| sort_order | int | |
| content | jsonb | Section-specific content |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `services`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| summary | text | |
| description | text (rich) | |
| icon | text | Icon name/path |
| price_range | text | Optional |
| is_featured | boolean | |
| status | enum: draft, published, archived |
| sort_order | int | |
| locale | varchar(10) | |
| translation_group | uuid | |
| seo fields | meta_title, meta_description, og_image, canonical_url, keywords |
| advanced_seo | indexable, follow_links, archive_allowed, canonical_override |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `service_faqs`
| Field | Type |
|-------|------|
| id | uuid | PK |
| service_id | uuid | FK → services |
| question | text | |
| answer | text | |
| sort_order | int | |

#### `projects`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| summary | text | |
| description | text (rich) | |
| thumbnail | text | URL |
| cover_image | text | URL |
| industry | varchar(100) | |
| client_name | text | Optional |
| project_url | text | |
| start_date | date | |
| end_date | date | |
| status | enum: draft, published, archived |
| is_featured | boolean | |
| locale | varchar(10) | |
| translation_group | uuid | |
| seo fields | as above |
| advanced_seo | as above |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `technologies`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| category | varchar(50) | e.g., Frontend, Backend, Cloud |
| icon | text | |
| sort_order | int | |

#### `project_technologies`
| Field | Type |
|-------|------|
| project_id | uuid | FK → projects, PK composite |
| technology_id | uuid | FK → technologies, PK composite |

#### `case_studies`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects (optional) |
| title | text | |
| slug | varchar(255) | UNIQUE |
| challenge | text (rich) | |
| research | text (rich) | |
| strategy | text (rich) | |
| results | text (rich) | |
| metrics | jsonb | |
| is_featured | boolean | |
| status | enum: draft, published, archived |
| seo fields | as above |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `posts`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| excerpt | text | |
| content | text (rich) | |
| cover_image | text | |
| author_id | uuid | FK → users |
| is_featured | boolean | |
| status | enum: draft, review, scheduled, published, archived |
| publish_at | timestamp | |
| unpublish_at | timestamp | |
| locale | varchar(10) | |
| translation_group | uuid | |
| seo fields | as above |
| advanced_seo | as above |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `categories`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| slug | varchar(255) | UNIQUE |
| description | text | |
| type | varchar(50) | e.g., post, project, resource |

#### `tags`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| slug | varchar(255) | UNIQUE |

#### `post_categories`
| Field | Type |
|-------|------|
| post_id | uuid | FK → posts, PK composite |
| category_id | uuid | FK → categories, PK composite |

#### `post_tags`
| Field | Type |
|-------|------|
| post_id | uuid | FK → posts, PK composite |
| tag_id | uuid | FK → tags, PK composite |

#### `resources`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| type | enum: guide, checklist, template, download |
| description | text | |
| content | text (rich) | |
| file_url | text | Optional download |
| is_featured | boolean | |
| status | enum: draft, published, archived |
| seo fields | as above |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `media_mentions`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| source_name | text | |
| source_url | text | |
| published_date | date | |
| summary | text | |
| is_featured | boolean | |
| status | enum: draft, published, archived |
| seo fields | as above |
| created_by | uuid | |
| created_at | timestamp | |

#### `faqs`
| Field | Type |
|-------|------|
| id | uuid | PK |
| question | text | |
| answer | text | |
| sort_order | int | |
| entity_type | varchar(50) | Polymorphic: service, project, post, resource, venture, release |
| entity_id | uuid | FK polymorphic |

#### `testimonials`
| Field | Type |
|-------|------|
| id | uuid | PK |
| author_name | text | |
| author_title | text | |
| author_avatar | text | URL |
| content | text | |
| source_type | enum: freelance_client, event_organizer, collaborator, general |
| project_id | uuid | FK → projects_freelance (optional) |
| event_id | uuid | FK → artist_events (optional) |
| rating | int | 1-5 |
| is_featured | boolean | |
| status | enum: pending_review, approved, rejected |
| display_order | int | |
| created_at | timestamp | |

---

### 3.3 Entrepreneur Domain

#### `ventures`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | text | |
| slug | varchar(255) | UNIQUE |
| description | text (rich) | |
| logo | text | URL |
| website | text | |
| founded_date | date | |
| status | enum: active, paused, acquired, closed |
| is_featured | boolean | |
| seo fields | as above |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `products`
| Field | Type |
|-------|------|
| id | uuid | PK |
| venture_id | uuid | FK → ventures |
| name | text | |
| slug | varchar(255) | UNIQUE |
| description | text | |
| launch_date | date | |
| url | text | |
| status | enum: active, deprecated |
| is_featured | boolean | |
| created_by | uuid | |
| created_at | timestamp | |

#### `venture_products`
| Field | Type |
|-------|------|
| venture_id | uuid | FK → ventures |
| product_id | uuid | FK → products |

---

### 3.4 Artist Domain

#### `releases`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| slug | varchar(255) | UNIQUE |
| type | enum: nasheed, tilawat, acting, podcast, interview, documentary |
| cover_image | text | URL |
| description | text (rich) | |
| release_date | date | |
| is_featured | boolean | |
| status | enum: draft, published, archived |
| seo fields | as above |
| lyrics | text | |
| credits | jsonb | |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `release_platforms`
| Field | Type |
|-------|------|
| id | uuid | PK |
| release_id | uuid | FK → releases |
| platform_name | varchar(100) | |
| platform_url | text | |

#### `release_lyrics`
| Field | Type |
|-------|------|
| id | uuid | PK |
| release_id | uuid | FK → releases, UNIQUE |
| lyrics_text | text | |
| lyrics_language | varchar(10) | |
| translations | jsonb | |

---

### 3.5 Freelance Projects Domain

#### `project_categories`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| slug | varchar(255) | UNIQUE |
| description | text | |
| color | varchar(7) | Hex |
| icon | text | |
| created_at | timestamp | |

#### `projects_freelance`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| client_id | uuid | FK → leads |
| category_id | uuid | FK → project_categories |
| status | enum: draft, in_progress, under_review, revision_requested, completed, archived |
| description | text | |
| scope_notes | text | |
| start_date | date | |
| expected_end_date | date | |
| actual_end_date | date | |
| total_agreed_amount | numeric | |
| currency | varchar(10) | |
| is_paid_project | boolean | |
| assigned_to | uuid[] | Array of user IDs |
| subcontractors | jsonb | |
| tags | text[] | |
| portal_access_enabled | boolean | |
| portal_token | varchar(255) | UNIQUE |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `project_milestones`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects_freelance |
| title | text | |
| description | text | |
| due_date | date | |
| status | enum: pending, in_progress, completed, approved |
| sort_order | int | |
| created_at | timestamp | |

#### `project_deliverables`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects_freelance |
| milestone_id | uuid | FK → project_milestones (optional) |
| title | text | |
| file_url | text | R2 URL |
| notes | text | |
| status | enum: pending, submitted, approved, revision_requested |
| client_feedback | text | |
| submitted_at | timestamp | |
| approved_at | timestamp | |

#### `project_activity_logs`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects_freelance |
| actor_id | uuid | FK → users |
| action | text | |
| metadata | jsonb | |
| created_at | timestamp | |

---

### 3.6 Artist Events Domain

#### `event_categories`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| slug | varchar(255) | UNIQUE |
| description | text | |
| color | varchar(7) | |
| icon | text | |
| created_at | timestamp | |

#### `artist_events`
| Field | Type |
|-------|------|
| id | uuid | PK |
| title | text | |
| category_id | uuid | FK → event_categories |
| organizer_name | text | |
| organizer_contact | text | |
| organizer_id | uuid | FK → leads (optional) |
| event_date | date | |
| event_time | time | |
| duration_minutes | int | |
| venue_name | text | |
| venue_address | text | |
| city | text | |
| country | text | |
| status | enum: inquiry, negotiating, confirmed, logistics_finalized, completed, declined, cancelled, archived |
| is_paid | boolean | |
| agreed_fee | numeric | |
| currency | varchar(10) | |
| cancellation_reason | text | |
| attendance_status | enum: attended, did_not_attend |
| notes | text | |
| is_public | boolean | |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `event_logistics`
| Field | Type |
|-------|------|
| id | uuid | PK |
| event_id | uuid | FK → artist_events, UNIQUE |
| travel_required | boolean | |
| travel_notes | text | |
| accommodation_required | boolean | |
| accommodation_notes | text | |
| sound_requirements | text | |
| technical_rider | text | |
| green_room_required | boolean | |
| additional_notes | text | |

#### `event_activity_logs`
| Field | Type |
|-------|------|
| id | uuid | PK |
| event_id | uuid | FK → artist_events |
| actor_id | uuid | |
| action | text | |
| metadata | jsonb | |
| created_at | timestamp | |

#### `artist_availability`
| Field | Type |
|-------|------|
| id | uuid | PK |
| date | date | |
| is_available | boolean | |
| note | text | |
| created_by | uuid | |
| updated_at | timestamp | |

**UNIQUE(date)** constraint.

---

### 3.7 Finance Domain

#### `payment_methods`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | varchar(100) | |
| type | enum: mobile_banking, bank, cash, international |
| is_active | boolean | |
| created_at | timestamp | |

#### `finance_payments`
| Field | Type |
|-------|------|
| id | uuid | PK |
| source_type | enum: freelance_project, artist_event |
| source_id | uuid | Polymorphic FK |
| client_id | uuid | FK → leads |
| amount | numeric | |
| currency | varchar(10) | |
| payment_method_id | uuid | FK → payment_methods |
| payment_date | date | |
| payment_type | enum: advance, installment, final, full |
| notes | text | |
| invoice_id | uuid | FK → finance_invoices (optional) |
| created_by | uuid | |
| created_at | timestamp | |

#### `finance_expenses`
| Field | Type |
|-------|------|
| id | uuid | PK |
| source_type | enum: freelance_project, artist_event, general |
| source_id | uuid | FK (nullable) |
| category | text | |
| description | text | |
| amount | numeric | |
| currency | varchar(10) | |
| payment_method_id | uuid | FK → payment_methods |
| expense_date | date | |
| receipt_url | text | Optional R2 URL |
| created_by | uuid | |
| created_at | timestamp | |

#### `finance_invoices`
| Field | Type |
|-------|------|
| id | uuid | PK |
| invoice_number | varchar(50) | UNIQUE, auto-generated (INV-YYYY-NNN) |
| source_type | enum: freelance_project, artist_event |
| source_id | uuid | |
| client_id | uuid | FK → leads |
| line_items | jsonb | Array of {description, quantity, unit_price, total} |
| subtotal | numeric | |
| discount | numeric | |
| total | numeric | |
| currency | varchar(10) | |
| status | enum: draft, sent, paid, cancelled |
| issued_date | date | |
| due_date | date | |
| notes | text | |
| pdf_url | text | R2 URL |
| created_by | uuid | |
| created_at | timestamp | |

---

### 3.8 Client Portal Domain

#### `portal_sessions`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects_freelance |
| portal_token | varchar(500) | UNIQUE |
| client_email | text | |
| password_hash | text | Optional |
| last_accessed_at | timestamp | |
| expires_at | timestamp | |
| created_at | timestamp | |

#### `portal_messages`
| Field | Type |
|-------|------|
| id | uuid | PK |
| project_id | uuid | FK → projects_freelance |
| sender_type | enum: admin, client |
| sender_id | uuid | |
| message | text | |
| attachments | jsonb | |
| is_read | boolean | |
| created_at | timestamp | |

---

### 3.9 Proposals Domain

#### `proposal_templates`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | text | |
| project_category_id | uuid | FK → project_categories |
| client_type | text | |
| type | enum: proposal, contract |
| content | text (rich) | With {{variable}} placeholders |
| variables | jsonb | |
| is_active | boolean | |
| created_by | uuid | |
| created_at | timestamp | |

#### `proposal_documents`
| Field | Type |
|-------|------|
| id | uuid | PK |
| template_id | uuid | FK → proposal_templates |
| project_id | uuid | FK → projects_freelance |
| client_id | uuid | FK → leads |
| resolved_content | text | After variable substitution |
| status | enum: draft, sent, accepted, rejected |
| pdf_url | text | R2 URL |
| sent_at | timestamp | |
| accepted_at | timestamp | |
| created_by | uuid | |
| created_at | timestamp | |

---

### 3.10 CRM Domain

#### `leads`
| Field | Type |
|-------|------|
| id | uuid | PK |
| full_name | text | |
| email | varchar(255) | |
| phone | varchar(50) | |
| company | text | |
| country | varchar(100) | |
| budget | text | |
| timeline | text | |
| project_type | text | |
| inquiry_type | varchar(50) | |
| message | text | |
| lead_source | varchar(50) | |
| status | enum: new, contacted, qualified, proposal_sent, negotiation, won, lost, archived |
| assigned_user_id | uuid | FK → users |
| follow_up_date | date | |
| follow_up_notes | text | |
| converted_to_project_id | uuid | FK → projects_freelance (optional) |
| converted_to_event_id | uuid | FK → artist_events (optional) |
| utm_source | varchar(255) | |
| utm_medium | varchar(255) | |
| utm_campaign | varchar(255) | |
| utm_content | varchar(255) | |
| utm_term | varchar(255) | |
| sla_minutes | int | DEFAULT 15 |
| first_response_at | timestamp | |
| response_status | enum: within_sla, warning, breached |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `lead_activities`
| Field | Type |
|-------|------|
| id | uuid | PK |
| lead_id | uuid | FK → leads |
| activity_type | text | |
| description | text | |
| metadata | jsonb | |
| created_by | uuid | |
| created_at | timestamp | |

#### `lead_notes`
| Field | Type |
|-------|------|
| id | uuid | PK |
| lead_id | uuid | FK → leads |
| note | text | |
| is_internal | boolean | DEFAULT true |
| created_by | uuid | |
| created_at | timestamp | |

#### `abandoned_leads`
| Field | Type |
|-------|------|
| id | uuid | PK |
| email | varchar(255) | |
| phone | varchar(50) | |
| source_page | text | |
| metadata | jsonb | |
| captured_at | timestamp | |

---

### 3.11 Forms Domain

#### `forms`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | text | |
| slug | varchar(255) | UNIQUE |
| form_type | varchar(50) | |
| description | text | |
| is_active | boolean | |
| success_message | text | |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `form_fields`
| Field | Type |
|-------|------|
| id | uuid | PK |
| form_id | uuid | FK → forms |
| label | text | |
| field_type | enum: text, email, phone, textarea, select, radio, checkbox, date, file, url, number |
| is_required | boolean | |
| placeholder | text | |
| description | text | |
| options | jsonb | For select/radio/checkbox |
| validation_rules | jsonb | |
| sort_order | int | |

#### `form_submissions`
| Field | Type |
|-------|------|
| id | uuid | PK |
| form_id | uuid | FK → forms |
| data | jsonb | Submitted field values |
| lead_id | uuid | FK → leads (optional, auto-created) |
| spam_score | float | |
| created_at | timestamp | |

#### `form_analytics`
| Field | Type |
|-------|------|
| id | uuid | PK |
| form_id | uuid | FK → forms |
| date | date | |
| views | int | |
| starts | int | |
| submissions | int | |
| abandonments | int | |
| conversion_rate | float | |

---

### 3.12 Newsletter Domain

#### `subscribers`
| Field | Type |
|-------|------|
| id | uuid | PK |
| email | varchar(255) | UNIQUE |
| name | text | |
| language | varchar(10) | |
| segments | text[] | |
| status | enum: pending, verified, active, unsubscribed, bounced, blocked |
| source | varchar(50) | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `subscriber_segments`
| Field | Type |
|-------|------|
| subscriber_id | uuid | FK → subscribers |
| segment | varchar(50) | |

#### `subscriber_verifications`
| Field | Type |
|-------|------|
| id | uuid | PK |
| subscriber_id | uuid | FK → subscribers |
| token | varchar(500) | UNIQUE |
| expires_at | timestamp | |
| verified_at | timestamp | |
| created_at | timestamp | |

#### `campaigns`
| Field | Type |
|-------|------|
| id | uuid | PK |
| subject | text | |
| content | text (rich) | |
| segments | text[] | Target segments |
| scheduled_at | timestamp | |
| status | enum: draft, scheduled, sending, sent, failed |
| sent_count | int | |
| open_count | int | |
| click_count | int | |
| unsubscribe_count | int | |
| bounce_count | int | |
| created_by | uuid | |
| created_at | timestamp | |
| sent_at | timestamp | |

---

### 3.13 Search Domain

#### `search_index`
| Field | Type |
|-------|------|
| id | uuid | PK |
| entity_type | varchar(50) | |
| entity_id | uuid | |
| title | text | |
| content | text | |
| summary | text | |
| url | text | |
| thumbnail | text | |
| published_at | timestamp | |
| content_type | varchar(50) | |
| locale | varchar(10) | |
| tsvector | tsvector | PostgreSQL FTS vector |

#### `search_synonyms`
| Field | Type |
|-------|------|
| id | uuid | PK |
| term | varchar(255) | |
| synonyms | text[] | |

---

### 3.14 Homepage Domain

#### `homepage_versions`
| Field | Type |
|-------|------|
| id | uuid | PK |
| version | int | |
| snapshot_json | jsonb | Complete homepage state |
| created_by | uuid | FK → users |
| created_at | timestamp | |

---

### 3.15 SEO Domain

#### `seo_meta`
| Field | Type |
|-------|------|
| id | uuid | PK |
| entity_type | varchar(50) | Polymorphic |
| entity_id | uuid | |
| meta_title | text | |
| meta_description | text | |
| og_image | text | |
| canonical_url | text | |
| keywords | text | |
| indexable | boolean | |
| follow_links | boolean | |
| no_archive | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

**UNIQUE(entity_type, entity_id)** constraint.

#### `slug_redirects`
| Field | Type |
|-------|------|
| id | uuid | PK |
| source_slug | varchar(255) | |
| destination_url | text | |
| redirect_type | int | 301 or 302 |
| entity_type | varchar(50) | Optional |
| is_active | boolean | |
| created_at | timestamp | |

---

### 3.16 Media Domain

#### `media_assets`
| Field | Type |
|-------|------|
| id | uuid | PK |
| filename | text | |
| original_name | text | |
| path | text | R2 path |
| type | varchar(50) | MIME type |
| size | int | Bytes |
| width | int | |
| height | int | |
| alt_text | text | |
| folder_id | uuid | FK → media_folders (optional) |
| variants | jsonb | Generated variant paths |
| uploaded_by | uuid | FK → users |
| created_at | timestamp | |
| deleted_at | timestamp | Soft delete |

#### `media_folders`
| Field | Type |
|-------|------|
| id | uuid | PK |
| name | text | |
| parent_id | uuid | FK → media_folders (self-ref) |
| path | text | |
| created_at | timestamp | |

---

### 3.17 System Domain

#### `settings`
| Field | Type |
|-------|------|
| id | uuid | PK |
| key | varchar(255) | UNIQUE |
| value | jsonb | |
| group | varchar(100) | |
| description | text | |
| updated_by | uuid | |
| updated_at | timestamp | |

#### `audit_logs`
| Field | Type |
|-------|------|
| id | uuid | PK |
| actor_id | uuid | |
| action | text | |
| entity_type | varchar(50) | |
| entity_id | uuid | |
| metadata | jsonb | |
| ip_address | varchar(45) | |
| created_at | timestamp | |

#### `content_revisions`
| Field | Type |
|-------|------|
| id | uuid | PK |
| entity_type | varchar(50) | |
| entity_id | uuid | |
| revision_number | int | |
| content_snapshot | jsonb | |
| created_by | uuid | |
| created_at | timestamp | |

---

### 3.18 Timeline Domain

#### `timeline_events`
| Field | Type |
|-------|------|
| id | uuid | PK |
| source_type | varchar(50) | e.g., project, venture, release, milestone, media_mention |
| source_id | uuid | |
| event_type | varchar(50) | |
| title | text | |
| description | text | |
| event_date | date | |
| icon | text | |
| url | text | |
| sort_order | int | |
| created_at | timestamp | |

---

## 4. Entity Relationship Summary

```
person_profiles ──┬── developer_profiles (1:1)
                 ├── entrepreneur_profiles (1:1)
                 └── artist_profiles (1:1)

services ──── service_faqs (1:N)
projects ──── project_technologies ──── technologies (M:N)
posts ──── post_categories ──── categories (M:N)
posts ──── post_tags ──── tags (M:N)
posts ──── authors → users

leads ──── lead_activities (1:N)
leads ──── lead_notes (1:N)
leads ──── projects_freelance (1:N)
leads ──── artist_events (1:N)

projects_freelance ──── project_milestones (1:N)
projects_freelance ──── project_deliverables (1:N)
projects_freelance ──── project_activity_logs (1:N)
projects_freelance ──── portal_sessions (1:1)
projects_freelance ──── portal_messages (1:N)

artist_events ──── event_logistics (1:1)
artist_events ──── event_activity_logs (1:N)

ventures ──── products (1:N)

releases ──── release_platforms (1:N)
releases ──── release_lyrics (1:1)

forms ──── form_fields (1:N)
forms ──── form_submissions (1:N)

faqs ──── polymorphic to services, projects, posts, resources, ventures, releases

media_assets ──── media_folders (N:1)
```

---

## 5. Naming Conventions

| Convention | Rule |
|-----------|------|
| Tables | snake_case, plural |
| Columns | snake_case |
| Primary Keys | `id` (uuid) |
| Foreign Keys | `{table}_id` (singular) |
| Enums | snake_case values |
| Timestamps | `created_at`, `updated_at` |
| Soft Delete | `deleted_at` |
| Polymorphic FKs | `entity_type` + `entity_id` |
| JSON columns | Document purpose in comment |

---

## 6. Dependencies

### 6.1 Cron Schedule Recommendations (Data-Layer Impact)

| Job | Tables Queried | Tables Mutated | Index Requirement | Consistency Rule |
|-----|---------------|----------------|-------------------|------------------|
| Content Scheduler | posts, pages, services, projects, resources, ventures, releases | Same | `idx_{entity}_publish_at` on `publish_at` | `WHERE status = 'scheduled' AND publish_at <= NOW()` must use index |
| Content Expirer | Same as above | Same | `idx_{entity}_expires_at` on `expires_at` | `WHERE expires_at <= NOW()` must use index |
| Newsletter Dispatcher | campaigns, subscribers, subscriber_segments | campaigns | `idx_campaigns_status_scheduled_at` on (status, scheduled_at) | Lock campaign row to prevent double-send |
| Media Cleanup | media_assets, all content tables (polymorphic refs) | media_assets | `idx_media_assets_deleted_at` on deleted_at | Orphan scan uses full-table scan on non-deleted assets — monitor performance |
| Search Indexer | All content tables, search_index | search_index | `idx_search_index_entity` on (entity_type, entity_id) | Upsert pattern — avoid duplicates |

**Key index recommendations:**
```sql
-- Content scheduling
CREATE INDEX idx_posts_publish_at ON posts(publish_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_expires_at ON posts(expires_at) WHERE expires_at IS NOT NULL;
-- Repeat for: pages, services, projects, resources, ventures, releases

-- Newsletter
CREATE INDEX idx_campaigns_status_scheduled ON campaigns(status, scheduled_at)
  WHERE status = 'scheduled';

-- Media cleanup
CREATE INDEX idx_media_assets_deleted_at ON media_assets(deleted_at) WHERE deleted_at IS NULL;

-- Search index
CREATE UNIQUE INDEX idx_search_index_entity ON search_index(entity_type, entity_id);
```

### 6.2 Sentry Integration (Data-Layer Impact)

| Aspect | Specification |
|--------|---------------|
| Repository Errors | Every repository method wrapped in try/catch; errors logged via `logger.error` and captured via `Sentry.captureException` |
| Query Performance | Slow query detection (> 500ms) logged as warning with query metadata |
| Migration Monitoring | Migration failures captured as Sentry issues with migration name and error detail |
| Seed Errors | Seed script failures captured with entity count and failure reason |
| Data Integrity | Constraint violations, unique conflicts, FK failures all captured with context |

### 6.3 Logging Requirements (Data-Layer Impact)

| Operation | Log Level | Data Captured |
|-----------|-----------|---------------|
| Repository CRUD | debug | Entity type, operation, ID, duration |
| Migration apply | info | Migration name, SQL statements count, duration |
| Seed execution | info | Entity type, records inserted, duration |
| Query performance warning | warn | Entity type, operation, duration (>500ms) |
| Constraint violation | error | Constraint name, entity type, values, error detail |
| Connection pool exhaustion | error | Active connections, queue depth |
| Migration failure | error | Migration name, error stack, state |
| Repository not found | debug | Entity type, lookup parameters |

**Repository logging pattern:**
```typescript
export class PostsRepository {
  async findById(id: string): Promise<Post | null> {
    const start = Date.now();
    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, id));
      logger.debug({ entity: 'post', operation: 'findById', id, duration: Date.now() - start });
      return post || null;
    } catch (error) {
      logger.error({ entity: 'post', operation: 'findById', id, error });
      Sentry.captureException(error, { tags: { entity: 'post', operation: 'findById' } });
      throw new DatabaseError('Failed to find post', { cause: error });
    }
  }
}
```

---

## 7. Migration Strategy

- **Tool:** Drizzle Kit (`drizzle-kit`)
- **Process:** Schema → Generate Migration → Review → Apply
- **Environment:** Automated CI migration on deploy
- **Rollback:** Each migration has a down script
- **Seeding:** Seed scripts in `packages/database/seed/`
