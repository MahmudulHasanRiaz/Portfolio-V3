# Frontend Architecture

> **PRD Reference:** [PRD.md](../PRD.md) — Design System, Dashboard UI Specification, Navigation Principles  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Application Overview

The platform includes three front-end applications sharing a common UI package:

| App | Tech | Rendering | Auth | Theme |
|-----|------|-----------|------|-------|
| `apps/web` | Next.js 16 App Router | SSR + ISR + Static | None (public) | Dark/Light |
| `apps/dashboard` | Next.js 16 + TanStack Router | SPA with RSC | Better Auth | Dark/Light |
| `apps/portal` | Next.js 16 + TanStack Router | SPA | Token-based | Light only |

---

## 2. Shared UI Package (`packages/ui`)

### 2.1 Design Token Architecture

Tokens are defined as CSS custom properties on `:root` and `[data-theme="dark"]`:

```css
/* Applied at app root via className on <html> */
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8FAFC;
  --text-primary: #0F172A;
  /* ... all tokens from PRD Design System */
}

[data-theme="dark"] {
  --bg-primary: #0F172A;
  --bg-secondary: #1E293B;
  --text-primary: #F8FAFC;
  /* ... dark theme overrides */
}
```

### 2.2 Component Architecture

All components in `packages/ui` follow:
```
packages/ui/src/
├── components/        # shadcn/ui primitives
│   ├── ui/           # Button, Input, Card, Dialog, etc.
│   ├── forms/        # FormField, RichTextEditor, FileUpload
│   ├── data/         # DataTable, KanbanBoard, Timeline
│   └── layout/       # Container, Grid, Sidebar, NavBar
├── hooks/            # useMediaQuery, useReducedMotion
├── utils/            # cn(), formatters, validators
└── styles/           # Global CSS, token definitions
```

### 2.3 Component Conventions

| Convention | Rule |
|-----------|------|
| Composition | Compound components for complex primitives |
| Forwarding | `forwardRef` on all interactive components |
| Polymorphism | `asChild` prop via Radix UI pattern where beneficial |
| Loading States | Every data-dependent component accepts `isLoading` |
| Empty States | Every list component accepts `emptyState` slot |
| Error Boundaries | Every section has an ErrorBoundary wrapper |

### 2.4 Component State Convention

```typescript
interface ComponentStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  error?: Error;
  emptyState?: React.ReactNode;
}

// Every data-fetching component renders:
if (isLoading) return <Skeleton />;
if (isError) return <ErrorState message={error.message} />;
if (isEmpty) return emptyState || <DefaultEmptyState />;
return <ActualContent />;
```

---

## 3. Public Website (`apps/web`)

### 3.1 Routing

Next.js App Router with file-based routing matching the sitemap in PRD:

```
app/
├── page.tsx                    # Homepage (Static + Revalidate)
├── about/page.tsx
├── developer/page.tsx
├── entrepreneur/page.tsx
├── artist/
│   ├── page.tsx
│   ├── schedule/page.tsx
│   └── booking/page.tsx
├── services/
│   ├── page.tsx                # Listing (ISR)
│   └── [slug]/page.tsx         # Detail (ISR)
├── projects/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── case-studies/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── blog/
│   ├── page.tsx
│   ├── category/[slug]/page.tsx
│   ├── tag/[slug]/page.tsx
│   └── [slug]/page.tsx
├── releases/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── ventures/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── resources/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── media/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── timeline/page.tsx
├── press-kit/page.tsx
├── book/page.tsx
├── contact/page.tsx
├── newsletter/page.tsx
├── search/page.tsx             # Dynamic
└── layout.tsx                  # Root layout with Nav, Footer
```

### 3.2 Data Fetching Pattern

```typescript
// Server Component — direct repository access
async function BlogPage({ searchParams }) {
  const posts = await postsRepository.listPublished({
    page: searchParams.page,
    category: searchParams.category,
  });
  return <BlogList posts={posts} />;
}

// Client Component — TanStack Query for interactive parts
function NewsletterForm() {
  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', 'metrics'],
    queryFn: () => fetch('/api/newsletter/metrics').then(r => r.json()),
  });
}
```

### 3.3 SEO Integration

Every page uses the shared SEO package:
```typescript
import { generateMetadata } from '@/packages/seo';

export async function generateMetadata({ params }): Promise<Metadata> {
  return generateMetadata('project', params.slug);
}
```

---

## 4. Admin Dashboard (`apps/dashboard`)

### 4.1 Architecture Pattern

The dashboard is a hybrid SPA embedded in Next.js:

- **Shell:** Next.js App Router provides the layout shell (sidebar + topbar)
- **Content:** TanStack Router handles client-side routing within the content area
- **Data:** TanStack Query for all server state
- **Forms:** React Hook Form + Zod
- **Server Actions:** For mutations

### 4.2 Layout Structure

```
Dashboard Layout
├── Sidebar (240px / 64px collapsed)
│   ├── Logo + Collapse toggle
│   ├── Navigation Groups
│   │   ├── Overview → Dashboard Home
│   │   ├── Content → Blog, Projects, Services, Releases, Ventures, SEO
│   │   ├── CRM → Leads, Forms
│   │   ├── Operations → Freelance Projects, Events, Finance
│   │   ├── Portal → Client Portal management
│   │   └── System → Media, Users, Settings
│   └── User info + Logout
├── Topbar (56px)
│   ├── Hamburger (mobile)
│   ├── Page title / Breadcrumb
│   ├── Search trigger
│   ├── Notification bell
│   └── User avatar dropdown
└── Content Area
    └── TanStack Router outlet
```

### 4.3 Feature Organization

```
features/{feature}/
├── components/       # Feature-specific components
│   ├── {Feature}List.tsx
│   ├── {Feature}Form.tsx
│   └── {Feature}Detail.tsx
├── hooks/            # TanStack Query hooks
│   └── use{Feature}s.ts
├── schemas/          # Zod schemas
│   └── index.ts
├── actions.ts        # Server Actions
├── page.tsx          # Dashboard page entry
└── types.ts
```

### 4.4 Data Fetching (TanStack Query)

```typescript
// Query key convention
const featureKeys = {
  all: ['features'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...featureKeys.lists(), filters] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
};

// Custom hook
export function usePosts(filters: PostFilters) {
  return useQuery({
    queryKey: featureKeys.list(filters),
    queryFn: () => fetchPosts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Invalidation on mutation
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostInput) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.lists() });
    },
  });
}
```

### 4.5 Form Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = createPostSchema;
type FormData = z.infer<typeof schema>;

export function PostForm({ post }: { post?: Post }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: post || defaultValues,
  });

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  async function onSubmit(data: FormData) {
    if (post) {
      await updatePost.mutateAsync({ id: post.id, ...data });
    } else {
      await createPost.mutateAsync(data);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="title" label="Title" />
        <FormField name="content" label="Content" component={<RichEditor />} />
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          {post ? 'Update' : 'Create'}
        </Button>
      </form>
    </FormProvider>
  );
}
```

---

## 5. Client Portal (`apps/portal`)

### 5.1 Key Differences from Dashboard

| Property | Dashboard | Portal |
|----------|-----------|--------|
| Theme | Dark/Light | Light only |
| Auth | Better Auth | Token-based (URL + optional password) |
| Layout | Sidebar + Topbar | Top tabs only |
| Scope | Full platform | Single project view |
| Users | Admin team | Client per project |

### 5.2 Portal Layout

```
Portal Layout (max-w-4xl centered)
├── Header
│   ├── Project title
│   ├── Status badge
│   └── Close date
├── Tabs (horizontal scrollable, pill-shaped)
│   ├── Overview
│   ├── Milestones
│   ├── Deliverables
│   ├── Messages
│   └── Payments
└── Content panel (tab-switched)
```

### 5.3 Portal Data Access

```typescript
// All API calls scoped to the portal token
const api = (token: string) => ({
  getProject: () => fetch(`/api/portal/${token}/project`),
  getMilestones: () => fetch(`/api/portal/${token}/milestones`),
  approveDeliverable: (id: string) =>
    fetch(`/api/portal/${token}/deliverables/${id}/approve`, { method: 'PUT' }),
  sendMessage: (message: string) =>
    fetch(`/api/portal/${token}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
});
```

---

## 6. Responsive Design

### 6.1 Breakpoints

| Breakpoint | Name | Layout |
|------------|------|--------|
| < 640px | Mobile | Single column, 16px padding |
| 640px - 1023px | Tablet | Single column, 24px padding |
| 1024px+ | Desktop | Multi-column, 32-48px padding |

### 6.2 Implementation

```typescript
// Tailwind: mobile-first by default
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

---

## 7. Performance

### 7.1 JavaScript Strategy

- Server Components by default (zero client JS)
- Interactive islands: only the interactive sections become client components
- Code splitting: dynamic imports for heavy components (RichTextEditor, Kanban, Charts)
- Lazy loading: below-fold content with `<Suspense>` boundaries

### 7.2 Image Optimization

```typescript
import Image from 'next/image';

// Hero image (priority load)
<Image
  src={heroImage}
  alt="Hero"
  priority
  sizes="100vw"
  className="object-cover"
/>

// Content images (lazy loaded)
<Image
  src={contentImage}
  alt={alt}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur"
  blurDataURL={base64Placeholder}
/>
```

### 7.3 Animation Performance

```typescript
// Motion — only opacity and transform (GPU accelerated)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: easeOut }}
  viewport={{ once: true }}
>
  {children}
</motion.div>
```

### 7.4 Core Web Vitals Targets

| Metric | Target |
|--------|--------|
| LCP | < 2 seconds |
| CLS | < 0.05 |
| INP | < 150ms |
| Homepage critical JS | < 150KB |
| Lighthouse Performance | 95+ |
