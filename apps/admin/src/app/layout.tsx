// Self-hosted fonts via Fontsource — the production build must not depend
// on reaching Google Fonts at build time. DM Sans is the PRD body/UI face
// (first in the tokens.css --font-sans stack); JetBrains Mono serves the
// --font-mono stack (used by <code>/<pre> in the freelance and workflow
// run pages). Mirrors the web app's font setup.
import "@fontsource/dm-sans";
import "@fontsource/jetbrains-mono";
import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./client-providers";
import { honoFetch } from "@/lib/hono-client";

// Tab favicon + title follow the Settings (Brand Identity), exactly like
// the sidebar brand mark — on the admin AND (via the public site's own
// Layout.astro) the public site. The favicon URL is read from Hono
// (GET /api/admin/settings/favicon); when the user changes it in
// Settings → Brand Identity, the tab icon follows. The static
// app/icon.png (the current favicon, 512×512) is the fallback — it also
// serves the login page, where there is no session yet and the settings
// fetch cannot authenticate. The title is the product name, "Portfolio
// OS"; pages that set their own title get "Page | Portfolio OS".
export async function generateMetadata(): Promise<Metadata> {
  let icon = "/icon.png";
  try {
    const data = await honoFetch<{ faviconUrl: string | null }>(
      "/api/admin/settings/favicon",
    );
    if (data?.faviconUrl) icon = data.faviconUrl;
  } catch {
    // No session (login page) or the settings fetch failed: keep the
    // static fallback so the tab still shows the face photo.
  }
  return {
    title: {
      default: "Portfolio OS",
      template: "%s | Portfolio OS",
    },
    icons: { icon },
  };
}

// Theme init: runs before paint so there is no light/dark flash.
// Mirrors the theme provider's logic (components/providers/theme-provider):
// a stored manual choice (localStorage "dashboard-theme", set by the theme
// toggle) wins, otherwise the OS preference decides (light only when the OS
// prefers light, dark otherwise). The <html> tag carries no hardcoded
// data-theme — previously it said data-theme="dark", so the first paint
// always rendered dark even for a stored light theme.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("dashboard-theme");var t;if(s==="light"||s==="dark"){t=s;}else{t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
