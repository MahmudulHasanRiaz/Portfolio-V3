"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { CommandPaletteProvider } from "@/components/providers/command-palette-provider";
import { Providers } from "@/components/providers";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CommandPaletteProvider>
        <Providers>
          {children}
        </Providers>
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}
