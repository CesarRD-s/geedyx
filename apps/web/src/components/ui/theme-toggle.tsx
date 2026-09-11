"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { iconButtonClass } from "./styles";

const emptySubscribe = () => () => {};
const isServerSnapshot = () => false;

/**
 * Discreet light/dark toggle. Renders nothing theme-specific until mounted to
 * avoid a hydration mismatch with next-themes (useSyncExternalStore returns
 * the server snapshot on the first client render). Toggles between the
 * resolved light and dark themes (system default is resolved on first load).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    isServerSnapshot,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={mounted && isDark ? "Activar tema claro" : "Activar tema oscuro"}
      title={mounted && isDark ? "Activar tema claro" : "Activar tema oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={iconButtonClass}
    >
      {mounted && isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}