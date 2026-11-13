import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  FolderKanban,
  ConciergeBell,
  Music,
  Lightbulb,
  Image,
  Users,
  Settings,
  MessageSquare,
  FileCheck,
  BarChart3,
  Megaphone,
  Wallet,
  UserCog,
  Search,
  Eye,
  TrendingUp,
  GitBranch,
  CreditCard,
  Receipt,
  Tags,
  Landmark,
  LayoutTemplate,
  History,
  Globe,
  Cpu,
  Building2,
  User,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      "super_admin",
      "admin",
      "writer",
      "media_manager",
      "marketer",
      "sales_executive",
      "project_manager",
      "finance_manager",
      "artist_manager",
    ],
  },
  {
    title: "Content",
    icon: FileText,
    href: "/dashboard/content",
    roles: ["super_admin", "admin", "writer"],
    children: [
      { title: "Homepage", href: "/dashboard/homepage", icon: LayoutTemplate },
      { title: "Blog", href: "/dashboard/blog", icon: Newspaper },
      { title: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { title: "Case Studies", href: "/dashboard/content/case-studies", icon: FileText },
      { title: "Services", href: "/dashboard/services", icon: ConciergeBell },
      { title: "Releases", href: "/dashboard/releases", icon: Music },
      { title: "Ventures", href: "/dashboard/ventures", icon: Lightbulb },
      { title: "Platforms", href: "/dashboard/platforms", icon: Globe },
      { title: "Technologies", href: "/dashboard/technologies", icon: Cpu },
      { title: "Clients", href: "/dashboard/clients", icon: Building2 },
      { title: "Media", href: "/dashboard/media", icon: Image },
      { title: "Revisions", href: "/dashboard/revisions", icon: History },
    ],
  },
  {
    title: "CRM",
    icon: Users,
    href: "/dashboard/crm",
    roles: ["super_admin", "admin", "sales_executive"],
    children: [
      { title: "Leads", href: "/dashboard/crm", icon: Users },
    ],
  },
  {
    title: "Operations",
    icon: Settings,
    href: "/dashboard/freelance",
    roles: ["super_admin", "admin", "project_manager", "artist_manager", "finance_manager"],
    children: [
      { title: "Freelance", href: "/dashboard/freelance", icon: FolderKanban },
      {
        title: "Finance",
        href: "/dashboard/finance",
        icon: Wallet,
        children: [
          { title: "Overview", href: "/dashboard/finance", icon: Wallet },
          { title: "Payments", href: "/dashboard/finance/payments", icon: CreditCard },
          { title: "Expenses", href: "/dashboard/finance/expenses", icon: Receipt },
          { title: "Invoices", href: "/dashboard/finance/invoices", icon: FileText },
          { title: "Expense Categories", href: "/dashboard/finance/expense-categories", icon: Tags },
        ],
      },
      { title: "Workflows", href: "/dashboard/workflows", icon: GitBranch },
    ],
  },
  {
    title: "Portal & Proposals",
    icon: MessageSquare,
    href: "/dashboard/portal",
    roles: ["super_admin", "admin", "project_manager"],
    children: [
      { title: "Portal", href: "/dashboard/portal", icon: MessageSquare },
      {
        title: "Proposals",
        href: "/dashboard/proposals",
        icon: FileCheck,
        children: [
          { title: "Documents", href: "/dashboard/proposals", icon: FileCheck },
          { title: "Templates", href: "/dashboard/proposals/templates", icon: LayoutTemplate },
        ],
      },
    ],
  },
  {
    title: "Marketing",
    icon: Megaphone,
    href: "/dashboard/seo",
    roles: ["super_admin", "admin", "marketer"],
    children: [
      { title: "SEO Overview", href: "/dashboard/seo", icon: BarChart3 },
      { title: "Metadata", href: "/dashboard/seo/metadata", icon: FileText },
      { title: "Redirects", href: "/dashboard/seo/redirects", icon: Eye },
      { title: "Sitemap", href: "/dashboard/seo/sitemap", icon: TrendingUp },
      { title: "Validation", href: "/dashboard/seo/validation", icon: Search },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    roles: ["super_admin", "admin", "marketer"],
    children: [
      { title: "Overview", href: "/dashboard/analytics", icon: BarChart3 },
      { title: "Traffic", href: "/dashboard/analytics/traffic", icon: TrendingUp },
      { title: "Pages", href: "/dashboard/analytics/pages", icon: FileText },
      { title: "Referrers", href: "/dashboard/analytics/referrers", icon: Users },
      { title: "UTM Campaigns", href: "/dashboard/analytics/utm", icon: Megaphone },
      // NOTE: there was a "Search" item here (top search queries), but
      // it was removed: the public site has NO search UI, so nothing
      // ever logs a search query and the page could never show data.
      // It was a dead menu item. If a site search is built later,
      // re-add it with the analytics/search endpoint (which exists).
    ],
  },
  {
    title: "System",
    icon: UserCog,
    href: "/dashboard/settings",
    roles: ["super_admin", "admin"],
    children: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        children: [
          { title: "General", href: "/dashboard/settings", icon: Settings },
          { title: "Profile", href: "/dashboard/settings/profile", icon: User },
          { title: "Payment Methods", href: "/dashboard/settings/payment-methods", icon: Landmark },
          { title: "Brand / Identity", href: "/dashboard/settings/brand-identity", icon: UserCog },
          { title: "Search Indexing", href: "/dashboard/settings/search-indexing", icon: Search },
        ],
      },
      { title: "Search", href: "/dashboard/system/search", icon: Search, children: [
        { title: "Statistics", href: "/dashboard/system/search/statistics", icon: BarChart3 },
      ] },
    ],
  },
];

export function isNavItemVisible(
  item: NavItem,
  userRoles: string[] | null,
): boolean {
  // null = roles not loaded yet (or the roles request failed). Show the item:
  // navigation is not a security boundary — each page enforces its own
  // authorization — and hiding everything on a failed fetch blanks the
  // sidebar for a logged-in admin.
  if (userRoles === null) return true;
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((r) => userRoles.includes(r));
}

export function filterNavigation(userRoles: string[] | null): NavItem[] {
  return navigation
    .filter((group) => isNavItemVisible(group, userRoles))
    .map((group) => {
      if (!group.children) return group;
      const filteredChildren = group.children.filter((child) =>
        isNavItemVisible(child, userRoles),
      );
      return { ...group, children: filteredChildren };
    })
    .filter((group) => {
      if (!group.children || group.children.length === 0) return true;
      return group.children.length > 0;
    });
}
