'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { cn } from '../../lib/cn';

const themeLabels = {
  dark: 'Oscuro',
  light: 'Claro',
} as const;

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <span aria-hidden="true" className={cn(['h-9 w-9'])} />;
  }

  const currentTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const Icon = currentTheme === 'dark' ? Moon : Sun;

  return (
    <button
      aria-label={`Tema actual: ${themeLabels[currentTheme]}. Cambiar a ${themeLabels[nextTheme]}`}
      className={cn([
        'grid h-9 w-9 place-items-center',
        'rounded-full border border-border-strong',
        'text-secondary transition',
        'hover:bg-surface-subtle hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      ])}
      onClick={() => setTheme(nextTheme)}
      title={`Tema: ${themeLabels[currentTheme]}`}
      type="button"
    >
      <Icon aria-hidden="true" className={cn(['h-4 w-4'])} />
    </button>
  );
}
