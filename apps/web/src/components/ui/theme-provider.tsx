"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * App-wide theme provider (next-themes, class strategy).
 *
 * defaultTheme "system" + enableSystem: GEEDYX follows the OS setting on
 * first load and lets the user override it manually with ThemeToggle.
 * `disableTransitionOnChange` avoids the light→dark flash of the whole tree
 * when swapping themes. The no-flash inline script is injected by next-themes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}