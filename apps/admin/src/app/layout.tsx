// Self-hosted fonts via Fontsource — the production build must not depend
// on reaching Google Fonts at build time. DM Sans is the PRD body/UI face
// (first in the tokens.css --font-sans stack); JetBrains Mono serves the
// --font-mono stack (used by <code>/<pre> in the freelance and workflow
// run pages). Mirrors the web app's font setup.
import "@fontsource/dm-sans";
import "@fontsource/jetbrains-mono";
import "./globals.css";
import { ClientProviders } from "./client-providers";

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
