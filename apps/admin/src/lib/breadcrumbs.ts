export const breadcrumbLabels: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/homepage": "Homepage",
  "/dashboard/revisions": "Revisions",
  "/dashboard/blog": "Blog",
  "/dashboard/blog/new": "New Post",
  "/dashboard/projects": "Projects",
  "/dashboard/projects/new": "New Project",
  "/dashboard/services": "Services",
  "/dashboard/services/new": "New Service",
  "/dashboard/releases": "Releases",
  "/dashboard/releases/new": "New Release",
  "/dashboard/ventures": "Ventures",
  "/dashboard/ventures/new": "New Venture",
  "/dashboard/platforms": "Platforms",
  "/dashboard/platforms/new": "New Platform",
  "/dashboard/technologies": "Technologies",
  "/dashboard/technologies/new": "New Technology",
  "/dashboard/clients": "Clients",
  "/dashboard/clients/new": "New Client",
  "/dashboard/media": "Media",
  "/dashboard/crm": "Leads",
  "/dashboard/forms": "Forms",
  "/dashboard/forms/new": "New Form",
  "/dashboard/freelance": "Freelance",
  "/dashboard/freelance/new": "New Project",
  "/dashboard/events": "Events",
  "/dashboard/events/new": "New Event",
  "/dashboard/events/availability": "Availability",
  "/dashboard/finance": "Finance",
  "/dashboard/finance/payments": "Payments",
  "/dashboard/finance/expenses": "Expenses",
  "/dashboard/finance/expense-categories": "Expense Categories",
  "/dashboard/finance/invoices": "Invoices",
  "/dashboard/portal": "Portal",
  "/dashboard/proposals": "Proposals",
  "/dashboard/proposals/new": "New Template",
  "/dashboard/proposals/templates": "Templates",
  "/dashboard/seo": "SEO",
  "/dashboard/seo/metadata": "Metadata",
  "/dashboard/seo/redirects": "Redirects",
  "/dashboard/seo/sitemap": "Sitemap",
  "/dashboard/seo/validation": "Validation",
  "/dashboard/analytics": "Analytics",
  "/dashboard/analytics/traffic": "Traffic",
  "/dashboard/analytics/pages": "Pages",
  "/dashboard/analytics/referrers": "Referrers",
  "/dashboard/analytics/utm": "UTM Campaigns",
  "/dashboard/analytics/search": "Search",
  "/dashboard/users": "Users",
  "/dashboard/users/new": "New User",
  "/dashboard/cron": "Cron",
  "/dashboard/settings": "Settings",
  "/dashboard/settings/general": "General",
  "/dashboard/settings/notifications": "Notifications",
  "/dashboard/settings/profile": "Profile",
  "/dashboard/settings/payment-methods": "Payment Methods",
  "/dashboard/settings/brand-identity": "Brand / Identity",
  "/dashboard/settings/search-indexing": "Search Indexing",
  "/dashboard/system/search": "Search",
  "/dashboard/system/search/statistics": "Statistics",
  "/dashboard/content": "Content",
  "/dashboard/content/pages": "Pages",
  "/dashboard/content/case-studies": "Case Studies",
  "/dashboard/content/faqs": "FAQs",
  "/dashboard/content/timeline": "Timeline",
  "/dashboard/categories": "Categories",
  "/dashboard/tags": "Tags",
  "/dashboard/workflows": "Workflows",
  "/dashboard/workflows/new": "New Workflow",
  "/dashboard/workflows/runs": "Runs",
};

/** Singular "Edit …" label per collection, for [id] routes whose last
 *  segment is a UUID. An id is never a readable crumb — before this,
 *  the fallback title-cased the raw UUID ("31c7b2e6 E079 …"). */
const editLabels: Record<string, string> = {
  "/dashboard/projects": "Edit Project",
  "/dashboard/blog": "Edit Post",
  "/dashboard/services": "Edit Service",
  "/dashboard/releases": "Edit Release",
  "/dashboard/ventures": "Edit Venture",
  "/dashboard/platforms": "Edit Platform",
  "/dashboard/technologies": "Edit Technology",
  "/dashboard/clients": "Edit Client",
  "/dashboard/content/case-studies": "Edit Case Study",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let current = "";

  for (const segment of segments) {
    const parent = current;
    current += "/" + segment;
    const label = UUID_RE.test(segment)
      ? (editLabels[parent] ?? "Edit")
      : breadcrumbLabels[current] ||
        segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: current });
  }

  return crumbs;
}
