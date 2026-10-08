'use client';

import type { AuthSession } from '@geedyx/contracts';
import { LogOut, Menu } from 'lucide-react';
import { type RefObject, useEffect, useState } from 'react';
import { BrandLogo } from '../brand/brand-logo';
import { ThemeToggle } from '../theme/theme-toggle';
import { cn } from '../../lib/cn';

type AppHeaderProps = {
  session: AuthSession;
  logoutPending: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onLogout: () => void;
  onOpenMenu: () => void;
};

function getUserInitials(displayName: string): string {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatCurrentTime(
  value: Date,
  locale: string,
  timeZone: string | null,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(value);
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(value);
  }
}

export function AppHeader({
  logoutPending,
  menuButtonRef,
  onLogout,
  onOpenMenu,
  session,
}: AppHeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();

    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const locale = session.user.effectiveLanguage === 'en' ? 'en-US' : 'es-HN';
  const timeZone = session.user.effectiveTimeZone;
  const timeLabel = currentTime
    ? formatCurrentTime(currentTime, locale, timeZone, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Cargando hora…';
  const hourLabel = currentTime
    ? formatCurrentTime(currentTime, locale, timeZone, {
        timeStyle: 'short',
      })
    : 'Cargando…';

  return (
    <header
      className={cn([
        'sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur',
      ])}
    >
      <div
        className={cn([
          'flex min-h-16 items-center justify-between gap-4',
          'px-4 sm:px-6',
        ])}
      >
        <div className={cn(['flex min-w-0 items-center gap-3'])}>
          <button
            aria-label="Abrir navegación"
            className={cn([
              'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-strong',
              'text-secondary transition hover:bg-surface-subtle hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              'lg:hidden',
            ])}
            onClick={onOpenMenu}
            ref={menuButtonRef}
            type="button"
          >
            <Menu aria-hidden="true" className={cn(['h-4 w-4'])} />
          </button>
          <div className={cn(['lg:hidden'])}>
            <BrandLogo />
          </div>
        </div>

        <div className={cn(['flex shrink-0 items-center gap-2'])}>
          <time
            className={cn(['hidden text-right text-xs text-muted md:block'])}
            dateTime={currentTime?.toISOString()}
            title={timeLabel}
          >
            {timeLabel}
          </time>
          <time
            className={cn(['text-xs text-muted md:hidden'])}
            dateTime={currentTime?.toISOString()}
          >
            {hourLabel}
          </time>
          <ThemeToggle />
          <div
            className={cn([
              'hidden items-center gap-2 border-l border-border pl-3 sm:flex',
            ])}
          >
            <span
              aria-hidden="true"
              className={cn([
                'grid h-8 w-8 place-items-center rounded-full',
                'bg-accent-muted text-xs font-semibold text-accent',
              ])}
            >
              {getUserInitials(session.user.displayName)}
            </span>
            <span className={cn(['max-w-36 truncate text-sm font-medium'])}>
              {session.user.displayName}
            </span>
          </div>
          <button
            aria-label="Cerrar sesión"
            className={cn([
              'grid h-9 w-9 place-items-center rounded-full border border-border-strong',
              'text-secondary transition hover:bg-surface-subtle hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              'disabled:cursor-not-allowed disabled:opacity-60',
            ])}
            disabled={logoutPending}
            onClick={onLogout}
            title="Cerrar sesión"
            type="button"
          >
            <LogOut aria-hidden="true" className={cn(['h-4 w-4'])} />
          </button>
        </div>
      </div>
    </header>
  );
}
