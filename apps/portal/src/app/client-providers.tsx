"use client";

import { ToastProvider, ToastViewport } from "@repo/ui";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
