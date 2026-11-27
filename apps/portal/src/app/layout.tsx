import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./client-providers";

// The portal is an authenticated client area: never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
