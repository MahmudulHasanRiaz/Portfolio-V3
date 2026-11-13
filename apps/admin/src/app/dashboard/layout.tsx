import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// The sidebar subtitle shows the public site's domain — NOT a hardcoded
// string. It is derived from PUBLIC_SITE_URL (the configured public-site
// URL on this worker), so when the custom domain is pointed at the
// public site the subtitle follows automatically. When the variable is
// unset/invalid the subtitle shows just "Admin".
function publicSiteHost(): string {
  const raw = process.env.PUBLIC_SITE_URL ?? "";
  if (!raw) return "";
  try {
    return new URL(raw).hostname;
  } catch {
    return "";
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell siteHost={publicSiteHost()}>{children}</DashboardShell>;
}
