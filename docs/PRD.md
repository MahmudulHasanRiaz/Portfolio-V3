# Personal Brand OS Platform

## Product Requirements Document (PRD)

### Version 1.5 — Final Gap Fix

| Field | Value |
|---|---|
| Project Owner | Mahmudul Hasan Riaz |
| Product Type | Personal Brand OS + Business Platform + Media Platform + Lead Generation Engine + Freelance Project OS + Artist Event OS + Client Portal |
| Status | BUILD READY — Architecture Frozen |
| PRD Version | 1.5 |

---

# Executive Summary

## Vision

Build a modern, SEO-first, mobile-dominant, enterprise-grade personal brand platform that presents Mahmudul Hasan Riaz primarily as a Software Engineer while also supporting Entrepreneur and Islamic Artist identities through dedicated discovery paths.

## Product Overview

The Personal Brand OS Platform is an enterprise-grade, content-driven digital ecosystem that combines three professional identities into a unified architecture. The platform operates simultaneously as a personal website, professional portfolio, content platform, media platform, lead generation engine, and CRM-connected business platform.

## Primary Business Goals

- Client acquisition through software engineering consulting
- Consulting lead generation
- Hiring opportunity discovery
- Entrepreneurial venture visibility and partnership cultivation
- Islamic artist discovery, distribution, and event booking

## Secondary Goals

- Personal brand authority building
- SEO-driven organic growth
- Content marketing and audience development
- Venture and product visibility
- Media distribution across streaming platforms
- Newsletter audience building and nurturing

## Success Metrics

| Phase | Metric | Target |
|---|---|---|
| Year 1 | Monthly Visitors | 50,000 |
| Year 2 | Monthly Visitors | 250,000 |
| Year 3 | Monthly Visitors | 1,000,000+ |

## Scale Target

- 1M+ monthly visitors at maturity
- Multi-language ready architecture
- Fully dynamic CMS-driven platform with zero developer dependency for content operations

## Core Principles

- Mobile dominant design priority
- SEO-first content architecture
- Conversion-focused user journeys
- Fully dynamic and admin-controlled
- Enterprise scalable infrastructure
- Performance treated as a product feature

---

# Product Strategy

## Identity Hierarchy

The platform maintains a strict identity priority that governs all homepage messaging, SEO strategy, and conversion funnels.

| Priority | Identity | Purpose |
|---|---|---|
| Primary | Software Engineer | Homepage messaging, SEO strategy, and conversion funnels prioritize engineering and consulting opportunities |
| Secondary | Entrepreneur | Ventures, products, founder story, partnerships |
| Tertiary | Islamic Artist | Nasheeds, tilawat, performances, booking requests |

## Identity Navigation

The homepage includes three dedicated discovery paths — Developer, Entrepreneur, and Artist — that act as primary navigation entry points into each identity's full platform experience.

## Homepage Positioning

The homepage is not a portfolio page. It is a conversion-focused landing experience designed so that within 10 seconds, visitors understand:
- Who Mahmudul Hasan Riaz is
- What he does
- Why he is credible
- How to contact him

The developer-first conversion strategy ensures that the primary identity is immediately clear, while entrepreneur and artist identities appear through dedicated snapshot sections and profile pages.

## Brand Tone

| Attribute | Description |
|---|---|
| Professional | Enterprise-grade communication |
| Trustworthy | Credibility-first presentation |
| Premium | High-quality design and content |
| Modern | Contemporary technology and design |
| Accessible | Inclusive by default |
| Faith-conscious | Respectful of Islamic values and audience |

## Homepage Success Criteria

The homepage follows a conversion funnel: Visitor → Trust → Authority → Lead. Every section serves this pipeline with measurable outcomes.

---

# User Experience

## Design Priority

Traffic expectations indicate the majority of visitors will use mobile devices. The design priority reflects this distribution.

| Device | Priority |
|---|---|
| Mobile | 60% (primary design target) |
| Desktop | 30% (enhancement) |
| Tablet | 10% (secondary) |

## UX Principles

- Medium content density — maximum information with minimal cognitive load
- High information clarity — no visitor should be confused about the owner's primary expertise
- Conversion focused — every page contains a logical next step
- Fast loading — performance is a product feature
- SEO optimized — every content entity is an SEO asset
- Accessibility ready — WCAG AA compliance target

## Navigation Principles

Simple, predictable, and consistent. No hidden critical actions.

## Accessibility Requirements

### Compliance Target

WCAG AA compliance across all surfaces.

### Focus Management

- All interactive elements receive a visible focus ring: 2px solid `--color-brand-500` with 2px offset
- Focus order follows logical DOM order (no positive tabindex values)
- Skip-to-content link is the first focusable element on every page
- Modals trap focus and restore focus to trigger element on close
- Route changes reset focus to the page heading (h1)

### Color and Contrast

- All text meets 4.5:1 minimum contrast ratio (normal) and 3:1 (large text)
- Interactive elements maintain 3:1 contrast against adjacent colors
- Status indicators never rely on color alone — paired with text labels or icons

### Reduced Motion

- All animations respect `prefers-reduced-motion: reduce` — animations reduce to instant transitions (0ms duration)
- No auto-playing animations without user control
- Parallax and continuous animations are excluded by design

### Touch Targets

- All interactive elements: minimum 44×44px touch target (mobile)
- Sufficient spacing between tappable elements: minimum 8px gap
- Form inputs maintain minimum 44px height

### Keyboard Navigation

- All functionality available via keyboard
- No keyboard traps (except intentional modal focus trap)
- Custom components implement expected keyboard interactions (Enter/Space for activation, Escape for dismissal, Arrow keys for selection)

## Mobile-First Design Rules

Mobile is the primary design target. Every component must be designed for mobile first, then progressively enhanced for tablet and desktop.

### Layout System

| Breakpoint | Padding |
|---|---|
| Mobile | 16px |
| Tablet | 24px |
| Desktop | 32px–48px |

### Typography

| Element | Mobile Size | Desktop Size |
|---|---|---|
| Hero Heading | 36–42px | 64–72px |
| Section Heading | 24–30px | 40–48px |
| Body Text | 16–18px | 16–18px |

### Border Radius

12px–20px across all components.

### Motion Guidelines

Allowed animations: fade, slide, scale, blur with 150–300ms duration. Heavy parallax, excessive animations, and 3D effects are avoided.

---

# Design System

## Design Philosophy

The design system follows a utility-first approach using Tailwind CSS v4 with shadcn/ui as the component foundation. All custom styling uses Tailwind classes. No custom CSS is written unless absolutely necessary.

The design language pairs a dark-primary theme with a light-accent secondary theme. The dark theme uses deep navy/charcoal backgrounds with electric blue accents. The light theme uses clean white backgrounds with the same electric blue as the primary accent.

## Color System

### Brand Colors (CSS Custom Properties)

```css
:root {
  /* Primary brand — Electric Blue */
  --color-brand-50:  #EFF6FF;
  --color-brand-100: #DBEAFE;
  --color-brand-200: #BFDBFE;
  --color-brand-300: #93C5FD;
  --color-brand-400: #60A5FA;
  --color-brand-500: #3B82F6;
  --color-brand-600: #2563EB;
  --color-brand-700: #1D4ED8;
  --color-brand-800: #1E40AF;
  --color-brand-900: #1E3A8A;

  /* Neutral palette */
  --color-neutral-50:  #F8FAFC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-200: #E2E8F0;
  --color-neutral-300: #CBD5E1;
  --color-neutral-400: #94A3B8;
  --color-neutral-500: #64748B;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1E293B;
  --color-neutral-900: #0F172A;

  /* Success / Error / Warning */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3B82F6;
}
```

### Theme Application

| Token | Dark Theme Value | Light Theme Value |
|---|---|---|
| `--bg-primary` | `#0F172A` (neutral-900) | `#FFFFFF` |
| `--bg-secondary` | `#1E293B` (neutral-800) | `#F8FAFC` (neutral-50) |
| `--bg-tertiary` | `#334155` (neutral-700) | `#F1F5F9` (neutral-100) |
| `--text-primary` | `#F8FAFC` (neutral-50) | `#0F172A` (neutral-900) |
| `--text-secondary` | `#94A3B8` (neutral-400) | `#475569` (neutral-600) |
| `--text-muted` | `#64748B` (neutral-500) | `#94A3B8` (neutral-400) |
| `--border-default` | `#334155` (neutral-700) | `#E2E8F0` (neutral-200) |
| `--border-hover` | `#475569` (neutral-600) | `#CBD5E1` (neutral-300) |

## Typography

### Font Stack

| Usage | Font | Source |
|---|---|---|
| Headings (Arabic) | Noto Naskh Arabic | next/font (google) |
| Body / UI (Latin) | DM Sans | next/font (google) |
| Mono / Code | JetBrains Mono | next/font (google) |

### Type Scale

```css
/* Heading scale */
--text-display: 4.5rem;   /* 72px — Hero heading, desktop */
--text-hero:    3.5rem;   /* 56px — Hero heading, mobile */
--text-h1:      2.5rem;   /* 40px */
--text-h2:      2rem;     /* 32px */
--text-h3:      1.5rem;   /* 24px */
--text-h4:      1.25rem;  /* 20px */
--text-body:    1rem;     /* 16px */
--text-small:   0.875rem; /* 14px */
--text-xs:      0.75rem;  /* 12px */
```

### Line Heights

| Usage | Line Height |
|---|---|
| Display / Hero | 1.1 |
| H1–H2 | 1.2 |
| H3–H4 | 1.3 |
| Body | 1.6 |
| Small / Caption | 1.5 |

## Spacing Scale

Uses Tailwind's default spacing scale: `--spacing-[0.5,1,1.5,2,2.5,3,3.5,4,5,6,8,10,12,16,20,24]` in rem units relative to 16px base.

| Token | Value | Typical Usage |
|---|---|---|
| `--spacing-2` | 0.5rem / 8px | Inner padding (tight) |
| `--spacing-4` | 1rem / 16px | Card padding, mobile gutter |
| `--spacing-6` | 1.5rem / 24px | Section padding, tablet gutter |
| `--spacing-8` | 2rem / 32px | Desktop gutter, card gap |
| `--spacing-12` | 3rem / 48px | Section spacing |
| `--spacing-16` | 4rem / 64px | Large section spacing |
| `--spacing-24` | 6rem / 96px | Hero section padding |

## Border Radius

```css
--radius-sm:   0.375rem;  /* 6px */
--radius-md:   0.5rem;    /* 8px */
--radius-lg:   0.75rem;   /* 12px */
--radius-xl:   1rem;      /* 16px */
--radius-2xl:  1.5rem;    /* 24px */
--radius-full: 9999px;    /* Full rounded */
```

### Radius Application

| Component | Radius |
|---|---|
| Cards | `--radius-xl` (16px) |
| Buttons (default) | `--radius-lg` (12px) |
| Buttons (icon) | `--radius-full` (circle) |
| Inputs | `--radius-lg` (12px) |
| Modals | `--radius-2xl` (24px) |
| Badges / Chips | `--radius-full` (pill) |

## Shadows

```css
--shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.1);
```

Dark theme shadows use increased opacity: `rgb(0 0 0 / 0.3)` for depth.

## Motion

Powered by the Motion library (formerly Framer Motion).

### Duration Tokens

| Token | Value |
|---|---|
| `--duration-fast` | 150ms |
| `--duration-normal` | 250ms |
| `--duration-slow` | 400ms |

### Easing Tokens

| Token | Value |
|---|---|
| `--ease-default` | cubic-bezier(0.4, 0, 0.2, 1) |
| `--ease-in` | cubic-bezier(0.4, 0, 1, 1) |
| `--ease-out` | cubic-bezier(0, 0, 0.2, 1) |
| `--ease-bounce` | cubic-bezier(0.34, 1.56, 0.64, 1) |

### Global Motion Rules

1. All animations use `--ease-out` unless a bounce effect is explicitly desired
2. Maximum animation duration: 400ms (exception: page transitions up to 600ms)
3. Respect `prefers-reduced-motion` at all times — reduce to instant transitions
4. Stagger children: max 5 children, 50ms delay between each
5. No parallax, no 3D transforms, no heavy GPU animations

### Common Presets

```typescript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.25, ease: easeOut }}

// Slide up + fade
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: easeOut }}

// Scale in (for modals/dialogs)
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.2, ease: easeOut }}
```

## Icons

Use `lucide-react` as the sole icon library. Each icon is imported individually to support tree-shaking.

```typescript
import { ArrowRight, Check, X, Menu, Search } from 'lucide-react';
```

Icon sizes: `16px` (inline), `20px` (default UI), `24px` (hero/large).

## Component Inventory

All components are shadcn/ui primitives customized via the design tokens above. The following components form the base library:

| Component | Source | Customizations |
|---|---|---|
| Button | shadcn/ui | 16px radius, brand colors, 3 variants (primary/secondary/ghost) |
| Input | shadcn/ui | 12px radius, neutral border, focus ring |
| Textarea | shadcn/ui | Same as Input |
| Select | shadcn/ui | Custom chevron, 12px radius |
| Card | shadcn/ui | 16px radius, border, optional hover elevation |
| Dialog / Modal | shadcn/ui | 24px radius, backdrop blur |
| Dropdown Menu | shadcn/ui | 12px radius items |
| Tabs | shadcn/ui | Underline or pill style |
| Badge | Custom | 9999px radius, color variants |
| Avatar | shadcn/ui | Circular, 3 sizes |
| Skeleton | shadcn/ui | Loading placeholder |
| Toast | shadcn/ui | 12px radius, slide-in animation |
| Tooltip | shadcn/ui | 6px radius, dark background |
| Sheet (Mobile Nav) | shadcn/ui | Slide from right, 24px radius on mobile |

### Component States

All interactive components follow these state conventions:

| State | Visual Treatment |
|---|---|
| Default | Normal border/background |
| Hover | Background darkens 5%, optional slight lift |
| Focus | 2px ring in brand-500, offset 2px |
| Active / Press | Scale 0.97, background darkens 10% |
| Disabled | Opacity 50%, no pointer events |
| Loading | Skeleton pulse or spinner overlay |

## Navigation Principles (Extended)

### Desktop Navigation (≥1024px)

| Element | Specification |
|---|---|
| Layout | Horizontal bar, fixed top, z-50 |
| Height | 64px (h-16) |
| Background | `--bg-primary` with 80% opacity + backdrop-blur-md |
| Border-bottom | 1px `--border-default` |
| Logo | 32px height, left-aligned |
| Primary Links | Center-aligned, 14px DM Sans medium, gap-8 |
| CTA Button | Right-aligned, brand-500 primary, 12px radius |
| Active Link | Brand-500 underline or brand-500 text color |
| Hover | Brand-400 text with subtle transition |
| Max-width | 1280px centered (mx-auto) |

### Mobile Navigation (<1024px)

| Element | Specification |
|---|---|
| Trigger | Hamburger icon (right-aligned header) |
| Panel | Sheet slide from right, full viewport height |
| Panel Width | 85vw (max 400px) |
| Panel Background | `--bg-primary` |
| Link Style | 18px DM Sans medium, full-width, left-aligned |
| Link Padding | py-4 px-6 |
| Active State | Left border 3px brand-500, brand-500 text |
| Close | X icon, top-right |
| Animation | Slide 0.3s ease-out, backdrop overlay fade 0.2s |
| CTA | Full-width button at bottom of sheet |

### Identity Switcher (Mobile & Desktop)

Three identity links (Developer, Entrepreneur, Artist) displayed as:
- **Desktop:** Inline tabs or pill group in navigation
- **Mobile:** First three items in sheet menu, grouped with visual separator

Active identity across both breakpoints: Brand-500 highlight.

---

# Information Architecture

## Primary Navigation

| Route | Description |
|---|---|
| / | Homepage |
| /developer | Developer profile |
| /entrepreneur | Entrepreneur profile |
| /artist | Artist profile |
| /artist/schedule | Artist event schedule |
| /artist/booking | Artist booking form |
| /services | Service listing |
| /projects | Project listing |
| /blog | Blog listing |
| /contact | Contact page |

## Secondary Navigation

| Route | Description |
|---|---|
| /case-studies | Case study listing |
| /resources | Resource center |
| /media | Media mentions |
| /timeline | Unified timeline |
| /press-kit | Press resources |
| /book | Booking hub |
| /newsletter | Newsletter hub |

## Global Utilities

- Search (route: /search)
- Language switcher (future-ready)
- Theme toggle (optional)
- Contact CTA

## Footer Structure

| Section | Links |
|---|---|
| Company | About, Contact, Press Kit |
| Content | Blog, Projects, Resources, Case Studies |
| Professional | Services, Consulting, Partnership, Hiring |
| Artist | Releases, Booking, Streaming Platforms |
| Legal | Privacy, Terms, Cookies |

## Complete Sitemap

### Public Routes

| Route | Entity Type |
|---|---|
| / | Homepage |
| /about | Master profile |
| /developer | Developer profile |
| /entrepreneur | Entrepreneur profile |
| /artist | Artist profile |
| /artist/schedule | Artist event schedule |
| /artist/booking | Artist booking form |
| /services | Service listing |
| /services/[slug] | Individual service page |
| /projects | Project listing |
| /projects/[slug] | Project details |
| /case-studies | Case study listing |
| /case-studies/[slug] | Case study detail |
| /blog | Blog listing |
| /blog/category/[slug] | Category archive |
| /blog/tag/[slug] | Tag archive |
| /blog/[slug] | Blog article |
| /releases | Artist releases |
| /releases/[slug] | Release detail |
| /ventures | Venture listing |
| /ventures/[slug] | Venture detail |
| /resources | Resource center |
| /resources/[slug] | Resource detail |
| /media | Media mentions |
| /media/[slug] | Media detail |
| /timeline | Unified timeline |
| /press-kit | Press resources |
| /book | Booking hub |
| /contact | Contact page |
| /newsletter | Newsletter hub |
| /search | Global search |

### Dashboard Routes

| Route | Purpose |
|---|---|
| /dashboard | Overview |
| /dashboard/content | Content manager |
| /dashboard/blog | Blog management |
| /dashboard/projects | Projects management |
| /dashboard/services | Services management |
| /dashboard/releases | Artist releases |
| /dashboard/ventures | Entrepreneur ventures |
| /dashboard/crm | Lead management |
| /dashboard/forms | Forms builder |
| /dashboard/media | Media library |
| /dashboard/seo | SEO center |
| /dashboard/users | User management |
| /dashboard/settings | Global settings |
| /dashboard/freelance | Freelance project list |
| /dashboard/freelance/new | Create new freelance project |
| /dashboard/freelance/[id] | Freelance project detail (tabs: Overview, Milestones, Deliverables, Finance, Portal, Activity) |
| /dashboard/finance | Finance overview (metrics + charts) |
| /dashboard/finance/payments | Payment log |
| /dashboard/finance/expenses | Expense log |
| /dashboard/finance/invoices | Invoice list and generation |
| /dashboard/events | Artist event list |
| /dashboard/events/new | Create new artist event |
| /dashboard/events/[id] | Artist event detail (tabs: Details, Logistics, Finance, Activity) |
| /dashboard/events/availability | Availability calendar management |
| /dashboard/portal | Portal-enabled project list |
| /dashboard/proposals | Proposal template list |
| /dashboard/proposals/new | Create proposal template |
| /dashboard/settings/payment-methods | Payment methods CRUD |
| /dashboard/settings/notifications | Notification preferences per trigger |
| /dashboard/settings/categories | Category management (Project Categories + Event Categories tabs) |

**UI Pattern Notes:**
| Route | UI Pattern |
|---|---|
| /dashboard | Widget grid (3-col → 2-col → 1-col) with Daily Overview panels |
| /dashboard/content | Tree-view or folder-style content hierarchy |
| /dashboard/blog | DataTable with status filters + inline tag editor |
| /dashboard/projects | Kanban board toggle (by status) + DataTable list (default) |
| /dashboard/services | DataTable with drag-and-drop reordering |
| /dashboard/releases | DataTable + cover thumbnail preview |
| /dashboard/ventures | DataTable + cover thumbnail preview |
| /dashboard/crm | Pipeline view (kanban by stage) + DataTable (default) |
| /dashboard/forms | List view + form preview modal |
| /dashboard/media | Grid layout (masonry or uniform), multi-select, drag-upload |
| /dashboard/seo | Form panels with audit scores, broken link checker |
| /dashboard/users | DataTable with role badges and status indicators |
| /dashboard/settings | Tabbed form panels (General, Notifications, Team, Billing) |

### Future Routes

| Route | Feature |
|---|---|
| /community | Community platform |
| /courses | Course platform |
| /products | Digital products |
| /ai-assistant | AI assistant |
| /ar | Arabic content |

---

# Feature Specifications

## Homepage Architecture

The homepage is the most important page in the platform. Its primary objective is conversion: Visitor → Trust → Authority → Lead.

### Section 1: Hero

**Objectives:** Immediate clarity, professional positioning, conversion trigger.

**Contents:** Profile image, full name, primary title, short positioning statement, primary CTA (Book Consultation), secondary CTA (View Projects), identity links, trust indicator.

**UI Specification:**
| Element | Desktop Spec | Mobile Spec |
|---|---|---|
| Layout | Full viewport height, centered content, max-w-4xl | Full viewport height, centered, reduced padding |
| Profile Image | 120×120px, rounded-full, border-4 brand-400 | 88×88px, rounded-full, border-4 brand-400 |
| Name | text-5xl font-bold, tracking-tight | text-3xl font-bold |
| Title | text-xl text-secondary, mb-8 | text-lg text-secondary |
| Primary CTA | h-12 px-8 text-base, brand-500 bg | h-12 px-6, full-width on mobile |
| Secondary CTA | h-12 px-8 text-base, ghost variant | h-12 px-6, ghost variant |
| Identity Links | Inline pill group, gap-4 | Horizontal scrollable, gap-3 |
| Bottom Indicator | Chevron-down icon, animate-bounce | Same |

Mobile requirement: Hero must fit within approximately 70–85vh. Users must see part of the next section without excessive scrolling.

### Section 2: Trust Indicators

Instant credibility metrics: projects completed, years experience, products built, releases published, countries reached.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | Horizontal row, max 6 items, centered |
| Desktop | Inline flex, gap-8, auto-width items |
| Mobile | Horizontal scroll snap (snap-x snap-mandatory), gap-4, py-8 |
| Card Style | No border, icon + number + label stack |
| Icon | 24px brand-400 |
| Number | text-3xl font-bold tabular-nums |
| Label | text-sm text-secondary |
| Animation | Stagger fade-in (50ms delay per item) |

### Section 3: Featured Services

Maximum 6 services, recommended 3–4. Each card contains title, summary, and CTA.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | 3-column grid (desktop), 2-column (tablet), single column (mobile) |
| Card | bg-secondary, rounded-xl, p-6, border |
| Card Hover | border-brand-400/30, shadow-md, -translate-y-0.5 transition |
| Icon | 32px brand-400, mb-4 |
| Title | text-lg font-semibold |
| Summary | text-sm text-secondary, 3-line clamp |
| CTA | text-sm brand-500, arrow-right icon, self-end |

### Section 4: Featured Projects

Thumbnail, title, summary, industry, CTA.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | 2-column grid (desktop), single column (mobile) |
| Image | 16/9 aspect-ratio, rounded-xl, object-cover |
| Overlay | Gradient overlay on hover: brand-900/60 to transparent |
| Title | text-xl font-semibold, mt-4 |
| Industry Badge | text-xs, bg-brand-500/10, text-brand-400, rounded-full px-3 py-1 |
| Summary | text-sm text-secondary, 2-line clamp |
| CTA | text-sm brand-500 |

### Section 5: Featured Case Studies

Challenge, solution, result, CTA.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | Alternating rows: image left / text right → image right / text left |
| Card | bg-secondary, rounded-xl, overflow-hidden |
| Content Padding | p-8 (desktop), p-6 (mobile) |
| Challenge Label | text-xs font-semibold uppercase tracking-wider, brand-400 |
| Quote | italic, text-base, border-l-4 brand-400, pl-4 |

### Section 6: Developer Expertise

Categories: Frontend, Backend, Cloud, DevOps, AI, Architecture.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | 3-column grid (desktop), 2-column (tablet), single (mobile) |
| Card | bg-secondary, rounded-xl, p-6, text-center |
| Icon | 40px, brand-400, mb-3 |
| Title | text-base font-semibold |
| Items | text-sm text-secondary, bullet list |

### Section 7: Entrepreneur Snapshot

Introduces founder identity without disrupting conversion flow. Contains founder story summary, featured ventures, featured products, CTA.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | 2-column: text left, venture cards right (desktop), stacked (mobile) |
| Section Label | "Entrepreneur" badge, text-xs, bg-amber-500/10, text-amber-400 |
| Story | text-base text-secondary, max-w-prose |
| Venture Card | bg-secondary, rounded-xl, p-4, border, flex row with icon |
| Product Badge | text-xs, bg-brand-500/10, text-brand-400, rounded-full |

### Section 8: Artist Snapshot

Artist discovery section. Contains latest release, streaming platforms, featured content, CTA.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | Card with cover image, streaming links row, CTA |
| Section Label | "Artist" badge, text-xs, bg-emerald-500/10, text-emerald-400 |
| Cover Image | 16/9 aspect-ratio, rounded-xl |
| Release Title | text-xl font-semibold |
| Platform Icons | Row of platform logo buttons (spotify, apple, youtube), 32px each |
| CTA | text-sm brand-500, "Explore Artist Profile →" |

### Section 9: Latest Content

Mixed feed of blog posts, resources, and announcements.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | Grid or carousel, 3-column (desktop), 2-column (tablet), single (mobile) |
| Card | bg-secondary, rounded-xl, p-5, border |
| Type Badge | text-xs, rounded-full px-2 py-0.5, color-coded by type |
| Title | text-base font-semibold, 2-line clamp |
| Date | text-xs text-muted |
| Summary | text-sm text-secondary, 3-line clamp |

### Section 10: Testimonials

Client, partner, and collaboration testimonials.

**UI Specification:**
| Element | Specification |
|---|---|
| Layout | Carousel with snap-scroll (mobile), centered card (desktop) |
| Card | bg-secondary, rounded-xl, p-8, max-w-2xl, text-center |
| Quote Icon | 32px brand-400/30, mb-4 |
| Quote Text | text-lg italic, leading-relaxed |
| Author | text-sm font-semibold, mt-6 |
| Role | text-xs text-muted |
| Navigation | Dot indicators or arrow buttons |
| Animation | Fade-slide on navigation, 0.3s ease-out |

### Section 11: Final CTA

Lead generation actions: Book Consultation, Contact, Partnership Inquiry.

**UI Specification:**
| Element | Specification |
|---|---|
| Background | Brand-500 to brand-700 gradient |
| Padding | py-20 (desktop), py-16 (mobile) |
| Heading | text-3xl font-bold text-white (desktop), text-2xl (mobile) |
| Subtext | text-lg text-white/80, max-w-xl |
| Buttons | White bg brand-700 text (primary), white/10 bg white text (secondary) |
| Spacing | Stack: heading → subtext → buttons, gap-6 |

### Announcement Bar

Global promotional area for new releases, services, ventures, or limited availability notices. Admin controlled.

**UI Specification:**
| Element | Specification |
|---|---|
| Position | Below primary nav, above hero |
| Height | 40px (mobile), 44px (desktop) |
| Background | Brand-500 |
| Text | text-xs text-white, font-medium, truncate |
| Close Button | X icon, 16px, text-white/70, right-aligned |
| Link | Full bar clickable or inline link |

## Developer Platform

### Route: /developer

**Purpose:** Establish authority as a software engineer.

**Sections:**
1. **Developer Hero** — Professional summary, years of experience, technology focus, CTA
2. **Biography** — Long-form personal story covering journey, background, mission, vision
3. **Experience Timeline** — Chronological professional history with role, organization, period, description
4. **Skills** — Categories: Frontend, Backend, DevOps, Cloud, AI, Architecture
5. **Technology Stack** — Grouped by Languages, Frameworks, Databases, Infrastructure, Tools
6. **Projects** — Featured project grid
7. **Case Studies** — Business impact-focused examples
8. **Certifications** — Optional, CMS-managed
9. **Resume** — Download available, low emphasis
10. **Contact CTA** — Consultation-focused

## Entrepreneur Platform

### Route: /entrepreneur

**Purpose:** Present founder and business identity.

**Sections:**
1. **Founder Hero** — Founder statement, mission, vision, CTA
2. **Founder Story** — Detailed entrepreneurial journey
3. **Ventures** — All ventures with dedicated profile pages, independent content, and independent SEO
4. **Products** — Products linked to ventures
5. **Milestones** — Timeline-driven presentation
6. **Business Philosophy** — Long-form content
7. **Media Mentions** — Interviews, podcasts, articles, coverage
8. **Partnership CTA** — Lead generation section

## Artist Platform

### Route: /artist

**Purpose:** Provide a professional artist experience.

**Sections:**
1. **Artist Hero** — Artist identity, introduction, booking CTA
2. **Biography** — Artist journey
3. **Featured Release** — Most recent release
4. **Releases Library** — Supports Nasheed, Tilawat, Acting, Podcast, Interview, Documentary
5. **Streaming Platforms** — Dynamic platform list (Spotify, Apple Music, YouTube Music, Amazon Music, Boomplay, TikTok Music, JioSaavn, Gaana, Facebook Music)
6. **Lyrics** — Release-linked lyrics
7. **Videos** — External-first strategy (YouTube, Facebook, Vimeo)
8. **Press Kit** — Downloadable assets
9. **Booking CTA** — Event booking form

## Forms System

### Dynamic Form Builder

Administrators can create and manage forms without developer involvement.

**Supported Form Types:** Contact, Consultation, Hiring, Partnership, Artist Booking, Custom.

**Field Types:** Text, Email, Phone, Textarea, Select, Radio, Checkbox, Date, File Upload, URL, Number.

**Configuration:** Required fields, optional fields, placeholders, descriptions, validation rules, field order.

**Submission Flow:** Visitor submits form → Validation → Database Storage → Lead Creation → Notification Dispatch → Success State.

**File Upload Support:** PDF, DOCX, Images, limited media files.

**Form Analytics:** Views, starts, submissions, abandonments, conversion rate.

**Notification Channels:** Email, Telegram, WhatsApp.

**Spam Protection:** Rate limiting, bot detection, validation, submission throttling.

## Content Scheduling Engine

All content entities support automated publishing through scheduling fields.

### Schedule Fields

- `publish_at` — Scheduled publication timestamp
- `unpublish_at` — Scheduled unpublish timestamp
- `expires_at` — Content expiry timestamp

### Supported Content Types

Pages, Posts, Projects, Services, Resources, Ventures, Releases, Media Mentions, Announcements, Campaigns, Special Offers.

### Content Status Workflow

Draft → Scheduled → Published → Expired → Archived

### Expired Content Behavior

Expired content is no longer visible publicly. Administrators retain access.

## Unified Timeline Engine

### Route: /timeline

The timeline engine powers the unified timeline, developer timeline, entrepreneur timeline, and artist timeline.

**Table:** `timeline_events`

**Supported Sources:** Projects, Ventures, Releases, Milestones, Media Mentions, Custom Events.

**Event Types:** Project Launch, Product Launch, Release Launch, Award, Media Appearance, Partnership, Milestone.

## Content Dependency Graph

The content dependency graph automatically connects related content across entity types.

### Service Relationships

Service → Related Projects → Related Case Studies → Related Blog Posts

### Project Relationships

Project → Related Services → Related Case Studies → Related Technologies

### Venture Relationships

Venture → Related Products → Related Media Mentions → Related Resources

### Release Relationships

Release → Related Releases → Related Media Mentions → Related Videos

### Blog Relationships

Post → Related Posts → Related Services → Related Projects

### Featured Content Engine

Administrators can mark content as Featured Project, Service, Venture, Release, Post, or Resource.

### Content Relationship Integrity

When deleting content, the system checks all linked entities. Available actions: Block Delete, Auto Unlink, Force Delete. All relationship changes are audit-logged.

## Media & Storage

### Storage Platform

Cloudflare R2 with Cloudflare CDN delivery.

### Supported Media Types

Images, Audio, Video, Documents.

### Image Strategy

All images are automatically processed. Generated formats: AVIF, WebP, JPEG. Generated sizes: Thumbnail, Small, Medium, Large, Original.

### Optimization Pipeline

Upload → Validation → Compression → Variant Generation → Storage → CDN Delivery

### Video Strategy

External platforms preferred (YouTube, Facebook, Vimeo). Internal video allowed when necessary with maximum 200 MB upload size.

### Audio Strategy

External streaming platforms preferred (Spotify, Apple Music, YouTube Music, Amazon Music, Boomplay, TikTok Music).

### Folder Structure

`/uploads` with subdirectories: images, projects, services, posts, releases, ventures, users, audio, video, documents.

### Media Metadata

Each asset stores: filename, path, type, size, dimensions, alt text, uploader, created date.

## Content Publishing Workflow

Create → Draft → Review → Schedule → Publish → Archive

### Rendering Strategy by Page Type

| Page Type | Rendering Strategy |
|---|---|
| Homepage | Static + Revalidate |
| Services | ISR |
| Projects | ISR |
| Blog | ISR |
| Releases | ISR |
| Search | Dynamic |
| Forms | Dynamic |

## Newsletter System

### Purpose

Build and nurture audiences through segmented email campaigns.

### Email Provider

Phase 1: Resend. Future: Sendy (self-hosted).

### Subscriber Fields

Email, Name, Language, Segment, Status, Subscription Date.

### Subscriber Status

Pending → Verified → Active → Unsubscribed → Bounced → Blocked

### Subscription Sources

Homepage, Blog, Resources, Dedicated Newsletter Page, Manual Import.

### Subscription Segments

Developer, Entrepreneur, Artist. Multiple segments allowed per subscriber.

### Subscription Preferences

Users can choose: Developer Updates, Entrepreneur Updates, Artist Updates, All Updates.

### Double Opt-In

Subscribe → Verification Email → Click Verification Link → Subscriber Activated.

**Table:** `subscriber_verifications`
**Fields:** id, subscriber_id, token, expires_at, verified_at, created_at
**Token Expiry:** 24 hours

### Newsletter Features

- Double Opt-In
- Unsubscribe flow with preference management
- Campaign management with history
- Segment management
- Bounce handling
- Suppression lists

### Newsletter Dashboard Metrics

Subscribers, Growth, Segment Distribution, Open Rate, Click Rate, Unsubscribe Rate.

## Testimonials

### Entity: testimonials

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| author_name | text | Person's name |
| author_title | text | e.g., "CEO at XYZ" |
| author_avatar | text | Image URL |
| content | text | Testimonial body |
| source_type | enum | freelance_client, event_organizer, collaborator, general |
| project_id | uuid | FK → projects_freelance (optional) |
| event_id | uuid | FK → artist_events (optional) |
| rating | int | 1–5 (optional) |
| is_featured | boolean | Show on homepage |
| status | enum | pending_review, approved, rejected |
| display_order | int | Sort order |
| created_at | timestamp | |

Testimonials can be submitted via a private link sent to clients post-project, or added manually by admin. Status must be `approved` to appear publicly. Featured testimonials appear in the homepage Testimonials section.

---

# CMS Architecture

## Purpose

Eliminate dependency on developers for content management.

## CMS Principles

Fully dynamic, content-first, SEO-aware, role-based, scalable.

## Homepage Manager

Section ordering, show/hide, content editing, featured item selection, CTA management, versioning with rollback support.

## Pages Manager

Manage About, Press Kit, Privacy, Terms, Custom Pages.

## Services Manager

Create, edit, publish, archive services.

## Projects Manager

Manage projects, technologies, galleries, links, SEO.

## Case Studies Manager

Manage challenge, research, strategy, results, metrics.

## Developer Manager

Manage skills, experience, certifications, resume.

## Entrepreneur Manager

Manage ventures, products, milestones, founder content.

## Artist Manager

Manage releases, lyrics, credits, streaming platforms, media.

## Blog Manager

Manage posts, categories, tags, authors, SEO.

## Resources Manager

Manage guides, checklists, templates, downloads.

## Testimonials Manager

Manage testimonials, approve/reject submissions, set featured status, link to projects or events.

## Media Manager

Manage images, audio, video, documents.

## SEO Manager

Manage meta titles, descriptions, OG images, canonical URLs, redirects, sitemaps.

## User Manager

Manage users, roles, permissions, access control.

## Homepage Versioning

**Table:** `homepage_versions`
**Fields:** version, snapshot_json, created_by, created_at
**Behavior:** Admin can restore any previous version.

---

# CRM Architecture

## Purpose

Manage all incoming business opportunities and inquiries as a lightweight sales management system.

## Supported Inquiry Types

- Client leads
- Consultation requests
- Hiring requests
- Partnership inquiries
- Artist booking requests

## Lead Sources

Contact Form, Consultation Form, Hiring Form, Artist Booking Form, Partnership Form, Newsletter Conversion, Manual Entry, Imported Lead.

## Lead Pipeline

New → Contacted → Qualified → Proposal Sent → Negotiation → Won → Lost → Archived

## Lead Fields

Full Name, Email, Phone Number, Company, Country, Budget, Timeline, Project Type, Inquiry Type, Message, Lead Source, Assigned User, Current Status, Created Date, Updated Date.

## Lead Timeline

Every action is stored: Lead Created, Email Sent, Phone Call, Meeting Scheduled, Proposal Sent, Status Changed, Lead Closed.

## Lead Notes

Sales team members can add internal notes. Notes are never visible publicly.

## Lead Assignment

Leads can be assigned to Sales Executive, Admin, or Super Admin.

## Abandoned Lead Capture

When a visitor enters an email or phone number and leaves the page, the system automatically stores the email, phone, source page, and timestamp with a CRM status of "Abandoned" for manual follow-up and remarketing.

## UTM Tracking

All lead capture forms track UTM parameters: utm_source, utm_medium, utm_campaign, utm_content, utm_term.

### Capture Scope

Contact Forms, Booking Forms, Consultation Forms, Hiring Forms, Newsletter Forms.

## Lead SLA System

**Fields:** sla_minutes, first_response_at, response_status.
**Default SLA:** 15 minutes for new leads.
**SLA States:** Within SLA, Warning, Breached.

## CRM Dashboard Metrics

Total Leads, Qualified Leads, Won Leads, Lost Leads, Conversion Rate, Lead Source Breakdown, Monthly Growth, Sales Pipeline Value.

## Lead Reporting

Total Leads, Qualified Leads, Won Leads, Lost Leads, Conversion Rate, Lead Source Breakdown, Monthly Growth.

## CRM Follow-Up Queue

The CRM includes a Follow-Up Queue dashboard view showing all leads where `follow_up_date` is today or in the past and lead is not yet Won or Lost, sorted by follow-up date ascending.

### Extended Lead Fields

| Field | Type | Description |
|---|---|---|
| follow_up_date | date | Scheduled follow-up date set by admin |
| follow_up_notes | text | What to discuss on follow-up |
| converted_to_project_id | uuid | FK → projects_freelance (set when lead is Won and project created) |
| converted_to_event_id | uuid | FK → artist_events (set when booking inquiry converts to event) |

---

# Freelance Project Management

## Overview

The Freelance Project Management module handles everything that happens after a CRM lead is marked as Won. It covers the full lifecycle of a freelance project from creation through delivery, payment, and closure. It is tightly integrated with the CRM, Finance, and Client Portal modules.

## Project Lifecycle (Status Flow)

```
Lead Won → Project Created → In Progress → Under Review → Revision Requested → Completed → Archived
```

Each status transition must be logged in `project_activity_logs`.

## Project Categories

Projects belong to a category managed via CRUD from the dashboard settings.

**Table:** `project_categories`
**Fields:** id, name, slug, description, color, icon, created_at.

A project can belong to one category.

## Core Entity: projects_freelance

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| title | text | Project title |
| client_id | uuid | FK → leads (existing CRM client record) |
| category_id | uuid | FK → project_categories |
| status | enum | draft, in_progress, under_review, revision_requested, completed, archived |
| description | text | Full project description |
| scope_notes | text | Scope of work notes |
| start_date | date | Project start date |
| expected_end_date | date | Expected delivery date |
| actual_end_date | date | Actual delivery date |
| total_agreed_amount | numeric | Total contract value |
| currency | varchar | Currency code (e.g., BDT, USD) |
| is_paid_project | boolean | false = pro bono / partnership |
| assigned_to | uuid[] | Team member user IDs (internal) |
| subcontractors | jsonb | List of subcontractor names/contacts |
| tags | text[] | Project tags |
| portal_access_enabled | boolean | Whether client portal is active |
| portal_token | varchar | Unique token for client portal access |
| created_by | uuid | Admin user |
| created_at | timestamp | |
| updated_at | timestamp | |

## Milestones: project_milestones

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK → projects_freelance |
| title | text | Milestone title |
| description | text | What will be delivered |
| due_date | date | Due date |
| status | enum | pending, in_progress, completed, approved |
| sort_order | int | Display order |
| created_at | timestamp | |

## Deliverables: project_deliverables

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK → projects_freelance |
| milestone_id | uuid | FK → project_milestones (optional) |
| title | text | Deliverable title |
| file_url | text | Cloudflare R2 file link |
| notes | text | Delivery notes |
| status | enum | pending, submitted, approved, revision_requested |
| client_feedback | text | Feedback from client |
| submitted_at | timestamp | |
| approved_at | timestamp | |

## Activity Log: project_activity_logs

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK → projects_freelance |
| actor_id | uuid | User who performed the action |
| action | text | e.g., "status_changed", "milestone_completed", "payment_received" |
| metadata | jsonb | Context data |
| created_at | timestamp | |

## Dashboard Features for Freelance Projects

- Project list with filter by status, category, client, date range
- Project detail view showing milestones, deliverables, payment summary, activity log
- Quick status change actions
- Team assignment panel
- Subcontractor notes field
- Link to client portal view

---

# Finance System

## Overview

The Finance System tracks all income and expenses across Freelance Projects and Artist Events. It is not an automated payment gateway — payments are manually logged by the admin after receiving them. The system provides full P&L visibility per project/event and globally.

## Payment Methods

Admin can configure payment methods from Settings → Payment Methods.

**Table:** `payment_methods`
**Fields:** id, name (e.g., bKash, Bank Transfer, Cash, PayPal), type (mobile_banking, bank, cash, international), is_active, created_at.

When logging a payment, admin selects from this list.

## Income: finance_payments

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| source_type | enum | freelance_project, artist_event |
| source_id | uuid | FK to projects_freelance or artist_events |
| client_id | uuid | FK → leads |
| amount | numeric | Amount received |
| currency | varchar | Currency code |
| payment_method_id | uuid | FK → payment_methods |
| payment_date | date | When payment was received |
| payment_type | enum | advance, installment, final, full |
| notes | text | Optional notes |
| invoice_id | uuid | FK → finance_invoices (optional) |
| created_by | uuid | |
| created_at | timestamp | |

## Expenses: finance_expenses

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| source_type | enum | freelance_project, artist_event, general |
| source_id | uuid | FK to source (nullable for general expenses) |
| category | text | e.g., tools, travel, subcontractor_fee, software, marketing |
| description | text | What was spent on |
| amount | numeric | |
| currency | varchar | |
| payment_method_id | uuid | FK → payment_methods |
| expense_date | date | |
| receipt_url | text | Optional receipt file |
| created_by | uuid | |
| created_at | timestamp | |

## Invoices: finance_invoices

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| invoice_number | varchar | Auto-generated (e.g., INV-2025-001) |
| source_type | enum | freelance_project, artist_event |
| source_id | uuid | FK |
| client_id | uuid | FK → leads |
| line_items | jsonb | Array of {description, quantity, unit_price, total} |
| subtotal | numeric | |
| discount | numeric | |
| total | numeric | |
| currency | varchar | |
| status | enum | draft, sent, paid, cancelled |
| issued_date | date | |
| due_date | date | |
| notes | text | |
| pdf_url | text | Generated PDF stored in R2 |
| created_by | uuid | |
| created_at | timestamp | |

Invoice PDFs are generated on-demand and stored in Cloudflare R2.

## Finance Dashboard Metrics

### Per Project / Event

- Total agreed amount
- Total received
- Total pending (agreed - received)
- List of all payment transactions
- Total expenses
- Net profit (received - expenses)

### Global Finance Dashboard

- Total income (all time, current month, by period)
- Total expenses (all time, current month, by period)
- Net profit (all time, current month)
- Income breakdown by source type (freelance vs artist)
- Income breakdown by client
- Pending receivables (total across all active projects/events)
- Monthly revenue trend chart
- Top earning clients

---

# Artist Event Management

## Overview

This module manages the full lifecycle of artist performance bookings — from initial inquiry through confirmation, event execution, settlement, and archival. It integrates with the Finance System (fees + expenses), the public website (schedule display + availability calendar), and the booking form.

## Event Categories

Events belong to a category managed via CRUD from dashboard settings.

**Table:** `event_categories`
**Fields:** id, name, slug, description, color, icon, created_at.

## Event Lifecycle (Status Flow)

```
Inquiry Received → Negotiating → Confirmed → Logistics Finalized → Completed → Archived
Inquiry Received → Declined (dead end)
Confirmed → Cancelled (with reason)
```

## Core Entity: artist_events

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| title | text | Event/program name |
| category_id | uuid | FK → event_categories |
| organizer_name | text | Organizer's name |
| organizer_contact | text | Phone / email |
| organizer_id | uuid | FK → leads (optional, if organizer is in CRM) |
| event_date | date | Performance date |
| event_time | time | Start time |
| duration_minutes | int | Expected performance duration |
| venue_name | text | Venue name |
| venue_address | text | Full address |
| city | text | City |
| country | text | Country |
| status | enum | inquiry, negotiating, confirmed, logistics_finalized, completed, declined, cancelled, archived |
| is_paid | boolean | true = paid gig, false = free/charity |
| agreed_fee | numeric | Agreed performance fee (if paid) |
| currency | varchar | |
| cancellation_reason | text | If cancelled |
| attendance_status | enum | attended, did_not_attend (set after event date) |
| notes | text | General notes |
| is_public | boolean | Show on public website schedule |
| created_by | uuid | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Event Logistics: event_logistics

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| event_id | uuid | FK → artist_events |
| travel_required | boolean | |
| travel_notes | text | Transport arrangements |
| accommodation_required | boolean | |
| accommodation_notes | text | Hotel/stay details |
| sound_requirements | text | Mic, speakers, monitors, etc. |
| technical_rider | text | Technical requirements |
| green_room_required | boolean | |
| additional_notes | text | Any other logistics |

## Event Activity Log: event_activity_logs

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| event_id | uuid | FK → artist_events |
| actor_id | uuid | User who performed the action |
| action | text | e.g., "status_changed", "fee_updated", "payment_received" |
| metadata | jsonb | |
| created_at | timestamp | |

## Public Schedule Integration

- Events with `is_public = true` and status `confirmed` or `completed` appear on the public website at `/artist/schedule`.
- The public schedule page shows event name (optional), city, country, date — no private details exposed.
- The booking form (`/artist/booking`) integrates with the availability calendar: dates with `confirmed` events are marked as unavailable.
- Admin manages available date ranges from Dashboard → Artist → Availability.

## Availability Management: artist_availability

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| date | date | Specific date |
| is_available | boolean | Override availability for this date |
| note | text | Internal note (e.g., "Reserved", "Traveling") |
| created_by | uuid | |
| updated_at | timestamp | |

The booking form queries confirmed events + availability overrides to render a calendar showing available/unavailable dates.

---

# Client Portal

## Overview

The Client Portal is a separate, authenticated view accessible at `/portal/[portal_token]`. Each freelance project can optionally enable a client portal. The client does not use the main dashboard — they access only their project view through a unique token-based URL or email-based login.

## Access Method

- Portal access is enabled per project by the admin (toggle in project settings).
- Client receives a unique portal link via email (sent from dashboard).
- Optional: Client can set a password for their portal account.
- Portal login is separate from admin dashboard login.

## Client Portal Features

| Feature | Description |
|---|---|
| Project Overview | Title, status, start date, expected end date |
| Milestone Tracker | All milestones with status (pending / in_progress / completed / approved) |
| Deliverable Review | View submitted files, download, leave feedback |
| Approve / Request Revision | Per-deliverable approval buttons with optional feedback message |
| Payment Summary | Total agreed, total paid, pending balance (no payment method details shown) |
| Invoice Download | Download invoice PDFs for each payment |
| Activity Feed | Timeline of project updates visible to client |
| Messages | Simple thread-based messaging between client and admin |

## Portal Messages: portal_messages

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK → projects_freelance |
| sender_type | enum | admin, client |
| sender_id | uuid | User ID or client token reference |
| message | text | Message body |
| attachments | jsonb | Optional file links |
| is_read | boolean | |
| created_at | timestamp | |

## Client Portal Authentication: portal_sessions

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK → projects_freelance |
| portal_token | varchar | Unique access token |
| client_email | text | Client email |
| password_hash | text | Optional password |
| last_accessed_at | timestamp | |
| expires_at | timestamp | |
| created_at | timestamp | |

## RBAC for Portal

Add a new role: **Client** — read-only access to their project, can submit feedback and approvals only. Portal is completely isolated from the admin dashboard.

## Portal UI Specification

### Design Mode

The client portal uses **light mode by default**. Dark mode is not supported. This ensures consistent presentation for all clients regardless of their OS preference.

### Layout

The portal uses a **tab-based navigation** layout with no sidebar. All navigation is handled through top tabs.

| Element | Specification |
|---|---|
| Container | max-w-4xl, centered, p-4 (mobile) / p-8 (desktop) |
| Header | Project title (text-xl font-semibold), status badge, optional close date |
| Tabs | Horizontal scrollable tabs: Overview, Milestones, Deliverables, Messages, Payments |
| Tab Style | Pill-shaped, text-sm, active tab: brand-500 bg with white text |
| Content | Full-width section below tabs, panel-switch with fade animation |

### Pages

**Overview Tab:**
| Element | Specification |
|---|---|
| Layout | 2-column: summary card + activity feed (desktop), stacked (mobile) |
| Summary Card | bg-white, rounded-xl, border, p-6 |
| Fields | Status, Start Date, Expected End, Total Budget, Paid, Balance |
| Activity Feed | Reverse-chronological timeline, icon per event type |

**Milestones Tab:**
| Element | Specification |
|---|---|
| List | Vertical timeline, each milestone is a step |
| Step Indicator | Circle (pending: gray border, in_progress: blue, completed: green, approved: filled green) |
| Labels | Milestone name, due date, status badge |
| Animation | Stagger fade-in on load |

**Deliverables Tab:**
| Element | Specification |
|---|---|
| Card | bg-white, rounded-xl, border, p-6, per deliverable |
| File Preview | Icon + filename + download button |
| Feedback | Text area with max 500 chars |
| Actions | "Approve" (green) / "Request Revision" (amber) buttons |
| Approval State | Approved: green checkmark + timestamp; Revision: amber badge + feedback excerpt |

**Messages Tab:**
| Element | Specification |
|---|---|
| Layout | Full-height chat: messages list + input bar |
| Message Bubble | Client: brand-500 bg, white text, right-aligned. Admin: gray-100 bg, dark text, left-aligned |
| Timestamp | text-xs text-gray-400, below each bubble |
| Input | Text area with send button, no rich text |
| Empty State | "No messages yet. Start a conversation." |

**Payments Tab:**
| Element | Specification |
|---|---|
| Summary | Total agreed, total paid, pending balance |
| Invoice List | Table: Invoice #, Amount, Date, Status, Download link |
| Status Badge | Paid (green), Pending (amber), Overdue (red) |

### Portal Authentication UI

| Element | Specification |
|---|---|
| Login Page | Centered card, max-w-sm, brand logo, "Project Access" title |
| Email Input | h-12, rounded-xl, text-center |
| Token Input | Hidden (auto-filled from URL), or password field if enabled |
| Submit Button | Full-width, h-12, brand-500 |
| Error State | Red alert box above form |
| Session | Token-based, no persistent cookies beyond session |

### Portal Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥1024px | 2-column layouts, side-by-side panels |
| ≥640px | Single column, full-width |
| <640px | Single column, reduced padding (p-4), stacked tabs |

---

# Proposal & Contract Templates

## Overview

A template-based system to quickly generate proposals and contracts for freelance projects. Templates are reusable and categorized by project type and client type.

## Template Entity: proposal_templates

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Template name (e.g., "Web App Development — Startup") |
| project_category_id | uuid | FK → project_categories |
| client_type | text | e.g., Startup, Corporate, NGO, Individual |
| type | enum | proposal, contract |
| content | text (rich) | Full template body with variable placeholders |
| variables | jsonb | List of dynamic fields (e.g., {{client_name}}, {{project_title}}, {{agreed_amount}}) |
| is_active | boolean | |
| created_by | uuid | |
| created_at | timestamp | |

## Generated Documents: proposal_documents

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| template_id | uuid | FK → proposal_templates |
| project_id | uuid | FK → projects_freelance |
| client_id | uuid | FK → leads |
| resolved_content | text | Final content after variable substitution |
| status | enum | draft, sent, accepted, rejected |
| pdf_url | text | Generated PDF in R2 |
| sent_at | timestamp | |
| accepted_at | timestamp | |
| created_by | uuid | |
| created_at | timestamp | |

## Workflow

```
Select Template → Fill Variables → Preview → Generate PDF → Send to Client (via email or portal) → Mark as Accepted → Auto-create Project
```

When a proposal is marked `accepted`, the system can auto-create a `projects_freelance` record with pre-filled data from the proposal.

---

# Notification System

## Automated Notification Triggers

The existing notification dispatch infrastructure (Email via Resend, Telegram, WhatsApp) is extended with the following triggers. Notification dispatch is handled by a background job (Cloudflare Cron Trigger or Supabase Edge Function). Admin can configure notification preferences per trigger from Settings → Notifications.

| Trigger Event | Notification Content |
|---|---|
| New lead submitted | "New lead: [Name] — [Service] — [Source]" |
| Lead status changed to Won | "Deal Won: [Client Name] — [Service]" |
| New freelance project created | "Project started: [Title] — [Client]" |
| Milestone marked completed | "Milestone done: [Milestone] in [Project]" |
| Payment received (project or event) | "Payment received: [Amount] [Currency] from [Client] — [Project/Event]" |
| Deliverable approved by client | "Client approved: [Deliverable] in [Project]" |
| Revision requested by client | "Revision requested: [Deliverable] — [Feedback summary]" |
| New artist event inquiry | "New event inquiry: [Organizer] — [Date] — [City]" |
| Event confirmed | "Event confirmed: [Title] — [Date] — [Venue]" |
| Event upcoming reminder | "Reminder: [Event] is in 3 days — [Venue], [City]" (triggered 3 days before event_date) |
| Invoice generated | "Invoice [Number] created for [Client]" |
| Overdue payment | "Payment overdue: [Client] — [Amount pending] — [Project]" (7 days past project completion with no payment) |

## Dashboard Home — Daily Overview

The `/dashboard` home route renders a Daily Operations Overview panel. It is the first screen an admin (or future team member) sees after login. It must show actionable, real-time status across all active modules.

| Widget | Data Source | Description |
|---|---|---|
| New Leads Today | CRM leads | Count + list of leads submitted today |
| Pending Lead Follow-ups | CRM leads with follow_up_date = today or overdue | Actionable list |
| Active Projects | projects_freelance | Count + status breakdown (in_progress, under_review, revision_requested) |
| Upcoming Milestones (7 days) | project_milestones | Milestones due within next 7 days |
| Pending Payments | finance_payments + projects_freelance | Total pending receivables amount |
| Upcoming Events (30 days) | artist_events | Confirmed events in next 30 days |
| Recent Client Feedback | project_deliverables | Latest approvals or revision requests from portal |
| Unread Portal Messages | portal_messages | Count + preview |
| Monthly Revenue Snapshot | finance_payments | Current month income vs. last month |
| Quick Actions | — | Buttons: Add Lead, New Project, Log Payment, Add Event, Create Invoice |

---

# Dashboard UI Specification

## Dashboard Layout

The dashboard is a full SPA with three structural layers.

### Sidebar

| Element | Specification |
|---|---|
| Expanded Width | 240px |
| Collapsed Width | 64px (icon-only) |
| Background | `--bg-secondary` |
| Border | Right 1px `--border-default` |
| Transition | Width 0.25s ease-out |
| Mobile | Hidden by default, overlay with backdrop |

**Navigation Groups:**
1. **Overview** — Dashboard Home
2. **Content** — Blog, Projects, Services, Releases, Ventures, SEO
3. **CRM** — Leads, Forms
4. **Operations** — Freelance Projects, Events, Finance
5. **Portal** — Client Portal management
6. **System** — Media, Users, Settings

Each group has a group label (text-xs uppercase text-muted, px-4 py-2) followed by nav items.

**Nav Item States:**
| State | Style |
|---|---|
| Default | text-sm text-secondary, px-4 py-2.5, rounded-lg |
| Hover | bg-tertiary, text-primary |
| Active | bg-brand-500/10, text-brand-500, font-medium |
| Collapsed (icon) | Centered icon only, tooltip on hover |

### Top Bar

| Element | Specification |
|---|---|
| Height | 56px (h-14) |
| Background | `--bg-primary` with backdrop-blur |
| Border-bottom | 1px `--border-default` |
| Left | Hamburger (mobile), breadcrumb or page title (desktop) |
| Right | Search (optional), notification bell, user avatar dropdown |
| Search Trigger | Icon button, opens command palette or search modal |
| User Avatar | 32px, rounded-full |

### Content Area

| Element | Specification |
|---|---|
| Padding | p-6 (desktop), p-4 (mobile) |
| Max Width | Fluid, fills remaining space after sidebar |
| Background | `--bg-primary` |

## Dashboard Widgets (Home)

The dashboard home is built from modular widgets arranged in a responsive grid.

### Widget Card

| Element | Specification |
|---|---|
| Background | `--bg-secondary` |
| Radius | `--radius-xl` (16px) |
| Padding | p-5 |
| Border | 1px `--border-default` |
| Header | Title (text-sm font-semibold) + optional action link |
| Body | Data visualization or list |

### Widget Grid

| Breakpoint | Columns |
|---|---|
| ≥1280px | 3 columns |
| ≥768px | 2 columns |
| <768px | 1 column |

## Data Tables

Used across all list views (Blog, Projects, Leads, etc.).

| Element | Specification |
|---|---|
| Design | Clean, minimal, no horizontal borders |
| Header | text-xs font-semibold uppercase tracking-wider text-muted |
| Rows | text-sm, py-3, alternating `--bg-primary` / `--bg-secondary` |
| Hover | Row highlight `--bg-tertiary/50` |
| Empty State | Centered icon + "No items yet" text + action CTA |
| Loading | Skeleton rows (3–5) matching row height |
| Pagination | Bottom bar: "Showing X of Y" + page buttons |
| Row Actions | Icon button (three-dots) → dropdown menu |

## Form Patterns

| Pattern | Specification |
|---|---|
| Layout | Full-width fields, stacked vertically |
| Label | text-sm font-medium, mb-1.5 |
| Input | h-10, rounded-xl, border, px-4, text-sm |
| Focus | Ring 2px brand-500, offset 0 |
| Error | Red border, error icon, text-xs error message below field |
| Submit Button | h-10 px-6, brand-500, rounded-xl |
| Cancel Button | Ghost variant, same height |
| Rich Text | Tiptap editor, toolbar with formatting options |
| File Upload | Drag-and-drop zone with 16/9 aspect ratio placeholder |

## Modal / Dialog Patterns

| Element | Specification |
|---|---|
| Overlay | `--bg-primary/60` with backdrop-blur-sm |
| Panel | `--bg-primary`, rounded-2xl, shadow-xl |
| Width | max-w-lg (default), max-w-2xl (large), max-w-sm (small) |
| Padding | p-6 |
| Animation | Scale in 0.2s ease-out, overlay fade 0.15s |
| Close | X icon top-right, or Escape key |
| Header | text-lg font-semibold + description text-sm text-secondary |
| Footer | Right-aligned actions: Cancel + Primary |

## Status Badges

| Status | Color |
|---|---|
| Active / Published / Won | `--color-success` (green) |
| Pending / Draft | `--color-warning` (amber) |
| Inactive / Archived / Lost | `--color-error` (red) |
| In Progress / Under Review | `--color-info` (blue) |
| Default | Neutral gray |

Badge style: text-xs font-medium, rounded-full, px-3 py-0.5, colored bg at 10% opacity.

---

# SEO Architecture

## SEO Philosophy

Every content entity is an SEO asset.

## SEO Entities

Services, Projects, Case Studies, Posts, Resources, Ventures, Releases, Media Mentions, Pages.

## Required SEO Fields

Meta Title, Meta Description, Slug, Canonical URL, Open Graph Image, Keywords.

## Advanced SEO Controls

Per-entity controls: indexable, follow_links, archive_allowed, canonical_override. Available for all SEO entities.

## SEO Performance Goals

| Metric | Target |
|---|---|
| Indexable Pages | 100% |
| Structured Data Coverage | 100% |
| Broken Links | <1% |
| Core Web Vitals | Passing |
| Internal Linking Coverage | High |

## Structured Data

Supported schemas: Person, Organization, ProfessionalService, Article, MusicRecording, BreadcrumbList, FAQPage, WebSite, SearchAction.

## Sitemap System

Automatically generated including Pages, Posts, Projects, Services, Ventures, Releases, Resources, Media.

## Robots Management

Dashboard controlled with Allow Rules, Disallow Rules, and Environment Rules.

## Redirect Manager

Prevents SEO loss after URL changes. Supports 301 Redirects, 302 Redirects, Slug History, Bulk Redirect Import.

## Broken Link Monitoring

Tracks broken internal links, missing media, 404 pages, redirect loops.

## Internal Linking Engine

Improves SEO and content discovery through automated related content connections.

## FAQ Engine

**Table:** `faqs`
**Fields:** question, answer, sort_order, entity_type, entity_id.
**Supported Content:** Services, Projects, Posts, Resources, Ventures, Releases.
**Schema:** FAQPage Schema generated automatically.

## Lighthouse Goals

| Category | Target |
|---|---|
| Performance | 95+ |
| Accessibility | 95+ |
| SEO | 100 |
| Best Practices | 95+ |

---

# Search Architecture

## Purpose

Enable fast discovery across the entire platform.

## Search Engine Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Query Engine | PostgreSQL Full Text Search (FTS) | Content querying, ranking, filtering, synonym expansion |
| Aggregation Layer | search_index table | Unified content discovery, cross-entity search mapping, search metadata storage |
| Synonym Expansion | search_synonyms table | Automatic synonym expansion during queries |

## Architecture Rule

All search queries execute through PostgreSQL Full Text Search. The search_index table serves as a content aggregation and indexing layer. Future migration to Meilisearch or AI Search must use search_index as the integration layer.

## Search Scope

Services, Projects, Case Studies, Blog Posts, Resources, Ventures, Releases, Media Mentions, Pages.

## Search Interface

Global Search Page at route /search.

## Search Features

Instant results, search suggestions, content type filters, keyword matching, highlighted results.

## Search Filters

Content Type, Category, Tag, Language, Date.

## Search Index Table

The dedicated search_index table avoids expensive queries and provides fast results.

### Search Result Structure

Title, Content Type, Summary, URL, Thumbnail, Published Date.

## Search Synonyms

**Table:** `search_synonyms`
**Purpose:** Improve search quality through automatic synonym expansion.

| Synonym Group |
|---|
| AI ↔ Artificial Intelligence |
| DevOps ↔ Platform Engineering |
| Startup ↔ Venture |

## Future Search Enhancements

| Phase | Technology | Status |
|---|---|---|
| Phase 1 | PostgreSQL Full Text Search | Active (current) |
| Phase 2 | Meilisearch | Optional future |
| Phase 3 | AI Search, Semantic Search, Natural Language Search | Optional future |

---

# Identity Architecture

## Shared Identity Model

A shared identity layer prevents data duplication across the About page, Developer Profile, Entrepreneur Profile, and Artist Profile.

### Core Entity: person_profile

| Field | Description |
|---|---|
| id | Primary key |
| full_name | Full legal/display name |
| headline | Professional headline |
| bio_short | Short biography |
| bio_long | Long-form biography |
| profile_image | Profile photo |
| cover_image | Cover photo |
| location | Geographic location |
| email | Contact email |
| phone | Contact phone |
| website | Personal website |
| resume_url | Resume download link |
| press_kit_url | Press kit download link |
| social_links | Social media profiles (JSON) |
| streaming_links | Music streaming platform links (JSON) |
| created_at | Timestamp |
| updated_at | Timestamp |

### Identity Extensions

| Table | Purpose |
|---|---|
| developer_profiles | Developer-specific information (skills, experience, certifications) |
| entrepreneur_profiles | Entrepreneur-specific information (ventures, products, milestones) |
| artist_profiles | Artist-specific information (releases, platforms, credits) |

### Rules

- Shared information lives inside `person_profile`
- Identity-specific information lives inside extension profiles
- No duplication of profile data across modules

### JSON Link Strategy

The `social_links` and `streaming_links` fields in `person_profile` are stored as JSON values by design. This decision is intentional for the following reasons:

- Social and streaming platform support changes frequently as new platforms emerge and others decline in relevance.
- New social platforms (e.g., emerging networks) may appear and require immediate inclusion without schema migrations.
- New streaming platforms (e.g., regional services) may appear and require the same flexibility.
- JSON storage reduces schema churn by avoiding join tables or new columns for each platform.
- JSON storage is appropriate for these fields because their primary use is display rendering on profile pages, not relational querying or aggregation.

This design is not a temporary measure. JSON is the permanent storage format for these link collections.

## Ownership Tracking

All content entities track ownership through `created_by` and `updated_by` fields. Future `owner_id` support is optional.

---

# Database Architecture

## Database Platform

PostgreSQL. Initially Supabase PostgreSQL, migrating to self-hosted PostgreSQL in the future. No direct database vendor coupling is allowed.

### Migration Strategy

PostgreSQL is the long-term database standard for the platform. Supabase serves as the initial managed provider to reduce operational overhead during early development and launch. The future migration target is a self-hosted PostgreSQL deployment for full infrastructure control at scale. The mandatory Repository Pattern exists specifically to reduce migration complexity — no application code should depend on Supabase-specific features or extensions. All database access is abstracted through repositories, enabling a provider switch without application-level changes.

## ORM

Drizzle ORM with mandatory Repository Pattern for database vendor lock-in avoidance.

## Core Database Domains

| Domain | Tables |
|---|---|---|
| Identity | users, roles, permissions, role_permissions, user_roles, sessions, accounts, verification_tokens, person_profiles, developer_profiles, entrepreneur_profiles, artist_profiles |
| Content | pages, homepage_sections, services, service_faqs, projects, technologies, project_technologies, case_studies, posts, categories, tags, post_categories, post_tags, resources, media_mentions, faqs, testimonials |
| Entrepreneur | ventures, products, venture_products |
| Artist | releases, release_platforms, release_lyrics |
| Freelance Projects | projects_freelance, project_milestones, project_deliverables, project_activity_logs, project_categories |
| Artist Events | artist_events, event_logistics, event_activity_logs, event_categories, artist_availability |
| Finance | finance_payments, finance_expenses, finance_invoices, payment_methods |
| Client Portal | portal_sessions, portal_messages |
| Proposals | proposal_templates, proposal_documents |
| Timeline | timeline_events |
| Search | search_index, search_synonyms |
| Homepage | homepage_versions |
| CRM | leads, lead_activities, lead_notes, abandoned_leads |
| Forms | forms, form_fields, form_submissions, form_analytics |
| Newsletter | subscribers, subscriber_segments, subscriber_verifications, campaigns |
| SEO | seo_meta, slug_redirects |
| Media | media_assets, media_folders |
| System | settings, audit_logs, content_revisions |

## Multi-Language Strategy

Every content entity supports `locale` and `translation_group` fields for future multi-language expansion.

## Content Status Workflow

Draft → Review → Scheduled → Published → Archived

---

# Security Architecture

## Security Principles

Least Privilege, Defense in Depth, Secure by Default, Auditability, Scalability.

## Authentication

**Provider:** Better Auth with Supabase PostgreSQL adapter.

**Methods:** Email + Password (primary), Magic Link (future-ready), Google Login (optional), Multi-Factor Authentication (future-ready).

**Session Management:** Secure session storage, session expiration, session revocation, device tracking (future-ready).

## Access Zones

Public Zone, Authenticated Zone, Administrative Zone, Restricted Zone.

## Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|---|
| Super Admin | Full system access including user management, role management, permissions, settings, content, CRM, SEO, media, analytics |
| Admin | Most platform functions except permission architecture and system-level security settings |
| Writer | Create, edit, publish content; manage posts and resources |
| Media Manager | Manage media, releases, streaming links, galleries |
| Sales Executive | Manage leads, CRM, lead notes, lead status |
| Marketer | Manage SEO, analytics, newsletter, campaign content |
| Project Manager | Manage freelance projects, milestones, deliverables, client portal; view finance for assigned projects |
| Finance Manager | Full access to Finance module (payments, expenses, invoices); read-only access to projects and events |
| Artist Manager | Manage artist events, logistics, availability; view event finance |
| Client (Portal) | Read-only access to their specific project via portal token; can submit deliverable feedback and approvals; can send portal messages |

### Permission Model

Permissions stored separately. Examples: `create_post`, `edit_post`, `publish_post`, `delete_post`, `manage_users`, `manage_media`, `manage_seo`, `manage_leads`, `manage_projects`, `manage_events`, `manage_finance`, `manage_portal`, `view_finance`, `create_invoice`, `manage_proposals`, `manage_availability`, `client_portal_access`.

## Route Protection

All administrative actions require verification of authentication, role, permission, and ownership (when applicable).

## Input Validation

All requests validated with Zod. All forms require validation. All APIs require Zod validation.

## File Upload Security

Validate mime type, file size, allowed extension, and malicious content.

**Upload Limits:** Images configured by media rules. Video maximum 200 MB. Documents admin configurable.

## Rate Limiting

Required for: Authentication, Forms, Newsletter, Search, Media Upload, API Requests.

## CSRF Protection

Enabled for sensitive operations.

## XSS Protection

Sanitize rich text, user inputs, embedded content.

## SQL Injection Protection

Protected through Drizzle ORM and parameterized queries.

## Audit Logging

All sensitive actions recorded: logins, logouts, content creation/editing/deletion, role changes, permission changes, lead actions, media actions.

## Security Monitoring

Monitor failed logins, excessive requests, permission violations, upload failures.

## Backup Strategy

Database backups, media backups, configuration backups.

## Future Security Enhancements

MFA, Security Dashboard, IP Allowlisting, Admin Device Verification.

---

# Infrastructure Architecture

## Infrastructure Freeze

The following architecture is officially frozen and approved for implementation.

| Component | Technology |
|---|---|
| Runtime | Next.js 16 on Vercel |
| Frontend Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Motion |
| Database | Supabase PostgreSQL (initial), Self-hosted PostgreSQL (future) |
| ORM | Drizzle ORM |
| Storage | Cloudflare R2 |
| CDN | Cloudflare Global Network |
| Authentication | Better Auth |
| Monitoring | Sentry |
| Analytics | Cloudflare Analytics, Microsoft Clarity, Umami |
| Email | Resend |
| CI/CD | GitHub Actions |

## Monorepo Strategy

Turborepo monorepo with the following structure:

```
root/
├── apps/
│   ├── web/          # Public website (SEO, lead generation, content platform)
│   ├── dashboard/     # CMS, CRM, Administration
│   ├── portal/        # Client-facing portal (separate Next.js app, token-authenticated)
│   └── docs/          # Documentation, architecture, development guides
├── packages/
│   ├── ui/            # Shared UI components
│   ├── auth/          # Authentication logic
│   ├── database/      # Database schema, migrations, repositories
│   ├── validation/    # Zod schemas
│   ├── seo/           # SEO utilities
│   ├── email/         # Email templates and sending
│   ├── analytics/     # Analytics tracking
│   ├── cms/           # CMS business logic
│   ├── crm/           # CRM business logic
│   ├── search/        # Search engine interface
│   ├── freelance/     # Freelance project management business logic
│   ├── events/        # Artist event management business logic
│   ├── finance/       # Finance, payments, invoices, expenses logic
│   ├── portal/        # Client portal logic and token management
│   ├── proposals/     # Proposal and contract template logic
│   ├── notifications/ # Notification dispatch (Telegram/WhatsApp/Email)
│   └── shared/        # Shared types and utilities
├── tooling/
├── scripts/
└── .github/
```

## Dashboard Architecture

The dashboard is a Single Page Application (SPA) built with:
- TanStack Router for client-side routing
- TanStack Query for server state management
- React Hook Form for form management
- Zod for validation

## API & Integration Architecture

**Public Website:** Server Components first.

**Dashboard:** Route Handlers and Server Actions.

**External Integrations:** REST APIs.

**Explicitly Excluded:** GraphQL, tRPC, separate backend service, microservice architecture.

### API Categories

Content APIs, CRM APIs, Media APIs, Search APIs, SEO APIs, Analytics APIs.

### Example Endpoints

`/api/posts`, `/api/projects`, `/api/services`, `/api/releases`, `/api/ventures`, `/api/search`, `/api/leads`, `/api/media`, `/api/projects`, `/api/projects/[id]/milestones`, `/api/projects/[id]/deliverables`, `/api/projects/[id]/payments`, `/api/projects/[id]/expenses`, `/api/events`, `/api/events/[id]/logistics`, `/api/events/availability`, `/api/finance/payments`, `/api/finance/expenses`, `/api/finance/invoices`, `/api/portal/[token]`, `/api/portal/[token]/messages`, `/api/proposals`, `/api/proposals/generate`, `/api/notifications/settings`.

### Response Format

**Success:** `{ success: true, data, meta }`
**Failure:** `{ success: false, message, errors }`

### Validation Layer

All requests validated with Zod.

## Feature-Based Architecture

The dashboard uses feature-based organization: auth, blog, projects, services, releases, ventures, crm, forms, newsletter, search, media, seo, freelance, events, finance, portal, proposals, notifications.

## Architectural Principles

Mobile Dominant, SEO First, Performance First, Content First, Admin Driven, Scalable, Secure, Maintainable.

---

# Deployment Architecture

## Deployment Platforms

| Component | Current | Future |
|---|---|---|
| Web (public site) | Vercel | VPS |
| Dashboard | Vercel | VPS |
| Database | Supabase PostgreSQL | Self-hosted PostgreSQL |
| Storage | Cloudflare R2 | Cloudflare R2 |
| CDN | Cloudflare Global Network | Cloudflare Global Network |
| Monitoring | Sentry | Sentry |
| DNS | Cloudflare | Cloudflare |

## Source Control

GitHub with branch strategy: `main` (production), `develop` (integration), `feature/*` (feature development).

## CI/CD

GitHub Actions with deployment pipeline: Push Code → Run Validation → Run Tests → Build → Deploy → Verify.

## Environment Management

Development, Staging, Production. Environment variables managed securely, never committed to repository.

## Infrastructure Monitoring

Deployment status, build failures, error tracking (Sentry), performance monitoring.

## Rollback Strategy

Support rollback to previous stable release.

## Release Management

Semantic Versioning (e.g., v1.0.0, v1.1.0, v2.0.0).

## Future DevOps Enhancements

Preview environments, advanced monitoring, automated recovery.

## Scheduling Runtime

Cloudflare Cron Trigger executes every minute with responsibilities:
- Publish scheduled content
- Expire content based on `expires_at`
- Update search index
- Trigger revalidation

## Performance Architecture

### Performance Targets

| Metric | Target |
|---|---|
| LCP | < 2 seconds |
| CLS | < 0.05 |
| INP | < 150ms |
| Homepage critical JS | < 150KB |

### Asset Optimization

Images (AVIF, WebP, JPEG fallback), fonts, scripts, styles, media. All optimized through the image pipeline with responsive variants.

### JavaScript Strategy

Reduce client JS, prefer Server Components, code splitting, lazy loading.

### CSS Strategy

Tailwind CSS with minimal runtime CSS.

### Cache Layers

Cloudflare CDN, Next.js Cache, Query Cache, Search Cache.

### Content Publishing Flow

Publish → Invalidate Cache → Revalidate → Serve Fresh Content

### Search Optimization

Dedicated search index avoids full table scans.

### Database Optimization

Indexes, efficient queries, Repository Pattern.

### Third-Party Scripts

Minimal usage, deferred loading, non-critical execution.

### Animation Performance Rules

| Rule | Specification |
|---|---|
| GPU Acceleration | Animate only `opacity` and `transform` — never `width`, `height`, `top`, `left` |
| Will-change | Use sparingly, only on elements actively animating, remove after animation ends |
| Stagger Limit | Max 5 children in stagger sequences |
| Motion Library | Use Motion's `layout` animations for shared element transitions |
| Route Transitions | Page-level transitions max 600ms, content fade only |
| Reduced Motion | All animations respect `prefers-reduced-motion: reduce` — skip to 0ms |

### Font Loading Strategy

| Font | Strategy | Resource |
|---|---|---|
| DM Sans | `next/font/google`, `display: swap`, subset: `latin` | Google Fonts via next/font |
| Noto Naskh Arabic | `next/font/google`, `display: swap`, subset: `arabic, latin` | Google Fonts via next/font |
| JetBrains Mono | `next/font/google`, `display: swap`, subset: `latin` | Google Fonts via next/font |

All fonts are preloaded at the application root. No runtime font loading. No FOUT/FOIT beyond the swap period.

### Image Optimization Rules

| Rule | Specification |
|---|---|
| Format | AVIF (primary), WebP (fallback), JPEG (legacy fallback) |
| Loading | Native lazy loading for below-fold images, `priority` for hero/LCP images |
| Responsive | `next/image` with `sizes` attribute for all breakpoints |
| Quality | 80% default, 90% for hero images |
| Placeholder | Blur placeholder (blurDataURL) for above-fold images, no placeholder for below-fold |
| Aspect Ratio | Explicit aspect ratio on all image containers to prevent CLS |

---

# AI Agent Execution Plan

## General AI Agent Rules

1. Never skip stages
2. Complete all acceptance criteria before proceeding
3. No temporary mock implementations unless explicitly approved
4. All code must be production-ready
5. Strict TypeScript required — no `any` types
6. All forms require validation
7. All APIs require Zod validation
8. Mobile-first implementation required
9. Accessibility requirements are mandatory
10. All new features require: Types, Validation, Permissions, Tests (where applicable), Documentation

## Execution Stages

### Stage 01 — Project Foundation

| Attribute | Description |
|---|---|
| Objective | Create monorepo foundation |
| Deliverables | Turborepo, apps, packages, TypeScript, ESLint, Prettier, Git configuration, GitHub Actions, Sentry error monitoring, environment validation |
| Acceptance Criteria | Project installs successfully, builds successfully, lint passes, type checks pass |
| Exit Criteria | Clean repository foundation available |
| Handoff | Proceed to Stage 02 |

### Stage 02 — Database Foundation

| Attribute | Description |
|---|---|
| Objective | Establish data layer |
| Deliverables | Drizzle setup, Supabase PostgreSQL connection, all schemas (including Chapter 33 entities and Chapter 31 entities), migrations, seeds, repositories |
| Acceptance Criteria | Migrations execute successfully, seed data works, repositories function correctly |
| Exit Criteria | Database layer fully operational |
| Handoff | Proceed to Stage 03 |

### Stage 03 — Authentication & RBAC

| Attribute | Description |
|---|---|
| Objective | Implement security layer |
| Deliverables | Better Auth, roles, permissions, session management, protected routes |
| Acceptance Criteria | Login works, logout works, role checks work, permission checks work |
| Exit Criteria | Security layer complete |
| Handoff | Proceed to Stage 04 |

### Stage 04 — Design System

| Attribute | Description |
|---|---|
| Objective | Create reusable UI foundation |
| Deliverables | Theme, typography, layout system, core components, form components, feedback components |
| Acceptance Criteria | Components documented, responsive behavior verified, accessibility verified |
| Exit Criteria | Reusable design system complete |
| Handoff | Proceed to Stage 04A |

### Stage 04A — Design Token Implementation

| Attribute | Description |
|---|---|
| Objective | Implement CSS custom properties and design tokens |
| Deliverables | CSS variables for color system, type scale tokens, spacing/radius/shadows, Motion presets, component state classes, theme switch (dark/light), `prefers-reduced-motion` compliance, font loading via next/font |
| Acceptance Criteria | All tokens match the Design System specification (PRD § Design System), dark/light themes toggle correctly, reduced motion respected, fonts load without layout shift |
| Exit Criteria | Design tokens fully operational |
| Handoff | Proceed to Stage 05 |

### Stage 05 — Dashboard Foundation

| Attribute | Description |
|---|---|
| Objective | Create admin shell |
| Deliverables | Layout, navigation, sidebar, routing, auth guards |
| Acceptance Criteria | Navigation functional, protected access working, mobile support verified |
| Exit Criteria | Dashboard shell complete |
| Handoff | Proceed to Stage 06 |

### Stage 06 — CMS Foundation

| Attribute | Description |
|---|---|
| Objective | Build content management system |
| Deliverables | Pages, Homepage Manager, Blog, Projects, Services, SEO fields, Media integration |
| Acceptance Criteria | CRUD works, publishing works, scheduling works, SEO fields saved correctly |
| Exit Criteria | CMS operational |
| Handoff | Proceed to Stage 07 |

### Stage 07 — Media System

| Attribute | Description |
|---|---|
| Objective | Build media infrastructure |
| Deliverables | R2 integration, media library, image optimization, file management |
| Acceptance Criteria | Uploads work, variants generated, media delivered via CDN |
| Exit Criteria | Media system complete |
| Handoff | Proceed to Stage 08 |

### Stage 08 — CRM System

| Attribute | Description |
|---|---|
| Objective | Build lead management infrastructure |
| Deliverables | Leads, pipeline, activities, notes, assignments, SLA tracking, UTM tracking |
| Acceptance Criteria | Lead creation works, status updates work, activities logged, notifications triggered |
| Exit Criteria | CRM operational |
| Handoff | Proceed to Stage 09 |

### Stage 09 — Forms Builder

| Attribute | Description |
|---|---|
| Objective | Build dynamic forms platform |
| Deliverables | Form builder, field types, validation, submission handling, lead mapping |
| Acceptance Criteria | Forms render correctly, validation works, submissions stored, lead creation works |
| Exit Criteria | Forms system complete |
| Handoff | Proceed to Stage 10 |

### Stage 10 — Freelance Project Management

| Attribute | Description |
|---|---|
| Objective | Build freelance project lifecycle system |
| Deliverables | projects_freelance CRUD, project_categories CRUD, project_milestones management, project_deliverables management with file upload, project_activity_logs, team assignment, subcontractor notes, project detail page with tabs (Overview / Milestones / Deliverables / Finance / Portal / Activity), project list with filters (status, category, client, date range), quick status change actions |
| Dependencies | Stage 02 (Database), Stage 03 (Auth/RBAC), Stage 07 (Media/R2 for deliverable files), Stage 08 (CRM — client_id FK from leads) |
| Acceptance Criteria | Project CRUD works, milestone creation and status update works, deliverable upload and status change works, activity log entries created on every status transition, team and subcontractor fields save correctly, project list filters work |
| Exit Criteria | Freelance project management fully operational |
| Handoff | Proceed to Stage 11 |

### Stage 11 — Finance System

| Attribute | Description |
|---|---|
| Objective | Build income, expense, and invoice tracking system |
| Deliverables | payment_methods CRUD (Settings → Payment Methods), finance_payments log with source linking (project or event), finance_expenses log with category and source linking, finance_invoices with auto-numbering (INV-YYYY-NNN), PDF invoice generation stored to Cloudflare R2, per-project/event finance summary (agreed / received / pending / expenses / net profit), global finance dashboard (total income, expenses, net profit, monthly trend chart, top clients, pending receivables), currency support |
| Dependencies | Stage 02 (Database), Stage 03 (Auth/RBAC), Stage 07 (R2 for PDF storage), Stage 10 (projects_freelance FK) |
| Acceptance Criteria | Payment method CRUD works, payment log entries create correctly with source linking, expense log entries create correctly, invoice generates correct PDF with line items, invoice PDF stored to R2 and downloadable, per-project finance summary calculates correctly, global dashboard metrics are accurate |
| Exit Criteria | Finance system fully operational |
| Handoff | Proceed to Stage 12 |

### Stage 12 — Artist Event Management + Client Portal + Proposals

| Attribute | Description |
|---|---|
| Objective | Build artist event system, client portal app, and proposal template system |
| Deliverables | **Artist Events:** artist_events CRUD, event_categories CRUD, event_logistics linked to events, event_activity_logs, availability management (artist_availability CRUD), public schedule page at /artist/schedule, booking form at /artist/booking with availability calendar showing unavailable dates, Finance integration (event fees + expenses via Finance System). **Client Portal:** separate Next.js app at apps/portal, token-based authentication (portal_sessions), portal login page, project overview tab, milestone tracker tab, deliverables tab with approve/request-revision actions, payments tab with invoice download, messages tab (portal_messages), light mode only, mobile-first, isolated from admin dashboard. **Proposals:** proposal_templates CRUD with rich text editor and variable placeholders, proposal_documents generation with variable substitution, PDF generation stored to R2, proposal status workflow (draft → sent → accepted → rejected), auto-create project from accepted proposal. **Notifications:** all automated notification triggers wired (as defined in PRD Notification System section), Telegram and WhatsApp webhook dispatch, per-trigger admin preference settings. |
| Dependencies | Stage 02 (Database), Stage 03 (Auth/RBAC), Stage 07 (R2), Stage 10 (projects_freelance for portal), Stage 11 (Finance for event fees) |
| Acceptance Criteria | Event CRUD with lifecycle status transitions works, logistics fields save correctly, availability calendar blocks confirmed event dates in booking form, public schedule shows only is_public=true confirmed/completed events, portal login works with token, all portal tabs render correct project data, client can approve and request revision on deliverables, portal messages send and receive correctly, proposal template variables substitute correctly in generated PDF, accepted proposal creates project record, all 12 notification triggers fire correctly to configured channels |
| Exit Criteria | Artist event management, client portal, proposal system, and notification system fully operational |
| Handoff | Proceed to Stage 13 |

### Stage 13 — Public Website

| Attribute | Description |
|---|---|
| Objective | Build public-facing platform |
| Deliverables | Homepage, Developer Profile, Entrepreneur Profile, Artist Profile, core pages, navigation, footer |
| Acceptance Criteria | Responsive design verified, SEO metadata working, all pages functional |
| Exit Criteria | Public site complete |
| Handoff | Proceed to Stage 14 |

### Stage 14 — Search System

| Attribute | Description |
|---|---|
| Objective | Build search infrastructure |
| Deliverables | Search index, Search UI, filters, suggestions, synonyms, PostgreSQL Full Text Search implementation |
| Acceptance Criteria | Results accurate, filters work, performance acceptable |
| Exit Criteria | Search system complete |
| Handoff | Proceed to Stage 15 |

### Stage 15 — SEO Engine

| Attribute | Description |
|---|---|
| Objective | Implement SEO platform |
| Deliverables | Metadata engine, schema engine, sitemap, redirects, SEO controls, FAQ schema |
| Acceptance Criteria | Metadata generated, schema valid, sitemap valid, redirects functional |
| Exit Criteria | SEO engine complete |
| Handoff | Proceed to Stage 16 |

### Stage 16 — Analytics & Monitoring

| Attribute | Description |
|---|---|
| Objective | Implement visibility layer |
| Deliverables | Cloudflare Analytics, Microsoft Clarity, Umami, dashboard reporting |
| Acceptance Criteria | Events tracked, reports visible |
| Exit Criteria | Monitoring operational |
| Handoff | Proceed to Stage 17 |

### Stage 17 — Testing

| Attribute | Description |
|---|---|
| Objective | Verify platform quality |
| Deliverables | Unit tests, integration tests, E2E tests, accessibility tests |
| Acceptance Criteria | Critical tests pass, no blocking defects |
| Exit Criteria | Quality verified |
| Handoff | Proceed to Stage 18 |

### Stage 18 — Optimization

| Attribute | Description |
|---|---|
| Objective | Achieve production-grade performance |
| Deliverables | Caching, bundle optimization, Core Web Vitals optimization, accessibility improvements, security hardening |
| Acceptance Criteria | LCP < 2s, CLS < 0.05, INP < 150ms, no critical vulnerabilities |
| Exit Criteria | Platform optimized |
| Handoff | Proceed to Stage 19 |

### Stage 19 — Production Launch

| Attribute | Description |
|---|---|
| Objective | Release platform |
| Deliverables | Production deployment, monitoring, validation, documentation |
| Acceptance Criteria | Deployment successful, no critical errors, all major flows verified |
| Exit Criteria | Platform live |
| Handoff | Project enters maintenance and growth phase |

---

# Launch Strategy

## Phase 1 — Foundation Launch

**Goals:** Core CMS online, Core CRM operational, Public website live, Lead capture functioning.

## Phase 2 — Growth Optimization

**Goals:** SEO expansion, content growth, search improvements, analytics refinement.

## Phase 3 — Authority Expansion

**Goals:** Knowledge hub, media coverage, venture growth, artist growth.

## Phase 4 — Scale

**Goals:** 1M+ monthly visitors, high conversion rates, global audience, multi-language growth.

## Success Metrics

### Traffic Targets

| Timeframe | Target |
|---|---|
| Year 1 | 50,000 monthly visitors |
| Year 2 | 250,000 monthly visitors |
| Year 3 | 1,000,000+ monthly visitors |

### Lead Metrics

Lead growth, qualified lead growth, conversion rate growth.

### Content Metrics

Published articles, projects, releases, resources.

### Business Metrics

Client acquisition, consulting revenue, partnership opportunities, artist booking requests.

### SEO Metrics

Indexed pages, organic traffic, keyword rankings, internal link coverage.

### Performance Metrics

LCP < 2s, CLS < 0.05, INP < 150ms.

## Testing Strategy

### Testing Layers

- Unit Testing: Utilities, repositories, validators, helpers, business logic
- Integration Testing: API endpoints, database operations, forms, CRM, authentication
- End-to-End Testing: Playwright for critical flows (homepage, contact form, consultation form, booking flow, newsletter flow, login flow, content publishing, lead management)
- Accessibility Testing: Required
- SEO Testing: Required
- Mobile Testing: Required across small mobile, large mobile, tablet, desktop
- Regression Testing: Required before major releases

### Quality Gates

Build Success, Test Success, Lint Success, Type Safety, Performance Thresholds.

### Release Criteria

No critical bugs, passing tests, passing performance targets, passing security checks, passing SEO validation.

## Deferred Features (v1.5)

The following features are approved but intentionally deferred and must not block v1 launch:
- Lead Scoring
- Command Palette
- Resource Gating
- Advanced Attribution
- Content Collections

## Future Expansion (Post-Launch)

- AI Assistant
- Arabic Language support
- Community features
- Course platform
- Digital products platform
- Meilisearch integration
- Sendy self-hosted email
- PostHog analytics
- Custom data warehouse
- Advanced attribution modeling

---

# Governance & Change Management

## Build Lock Declaration

This PRD is implementation-ready. Any new feature requests after this point must be processed through the Change Request (CR) process.

## Architecture Freeze

The following systems are frozen and require CR-03 review for any changes:

- Identity Architecture
- CMS Architecture
- CRM Architecture
- SEO Architecture
- Search Architecture
- Database Architecture
- Storage Architecture
- Authentication Architecture
- Deployment Architecture
- Monitoring Architecture

## Change Request Process

### CR-01 — Minor Change

**Examples:** Field addition, small UI change, text update.
**Approval:** Admin.

### CR-02 — Medium Change

**Examples:** New module, new content type, workflow change.
**Approval:** Project Owner.

### CR-03 — Major Change

**Examples:** Architecture change, database change, infrastructure change.
**Approval:** Architecture Review Required.

## PRD Status

| Attribute | Status |
|---|---|
| PRD Version | 1.5 |
| Execution Plan | Complete |
| Design System | Specified |
| UI/UX Specifications | Added |
| Business Layer | Approved |
| Architecture Layer | Approved |
| Engineering Layer | Approved |
| Execution Layer | Approved |
| Infrastructure Layer | Approved |
| AI Agent Readiness | Approved |
| Architecture Freeze | ACTIVE |
| Overall Status | BUILD READY |

---

# Architecture Decision Records (ADR)

The following section is a non-functional documentation recommendation. ADRs are not part of the runtime architecture and do not modify the PRD. They serve as implementation guidance for future documentation.

Future implementation documentation may include the following ADRs:

| ADR | Topic |
|---|---|
| ADR-001 | Shared Identity Model — Rationale for person_profiles and extension tables |
| ADR-002 | Search Architecture — PostgreSQL FTS as query engine with search_index aggregation layer |
| ADR-003 | Better Auth Selection — Authentication provider decision and alternative evaluation |
| ADR-004 | Media Architecture — Cloudflare R2 storage with CDN delivery pipeline |
| ADR-005 | Monorepo Structure — Turborepo workspace organization and package boundaries |

These ADRs are documentation only. They do not alter the architecture, database schema, infrastructure, or feature scope defined in this PRD. They may be created during implementation as historical records of architectural decisions.

---

*End of PRD v1.5 — Final Gap Fix*
