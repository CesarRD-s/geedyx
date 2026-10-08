'use client';

import type { AuthSession } from '@geedyx/contracts';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import logoIconDark from '../../assets/geedyx-logo-icon-dark.png';
import logoIconLight from '../../assets/geedyx-logo-icon-light.png';
import { getVisibleNavigation, isNavigationItemActive } from './navigation-config';
import { cn } from '../../lib/cn';

const pinnedStorageKey = 'geedyx.navigation.pinned';

type AppNavigationProps = {
  session: AuthSession;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onPinnedChange: (pinned: boolean) => void;
};

export function AppNavigation({
  mobileOpen,
  onCloseMobile,
  onPinnedChange,
  session,
}: AppNavigationProps) {
  const pathname = usePathname();
  const visibleNavigation = useMemo(
    () => getVisibleNavigation(session.user.permissions),
    [session.user.permissions],
  );
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedPinned = window.localStorage.getItem(pinnedStorageKey) === 'true';
      setPinned(storedPinned);
      onPinnedChange(storedPinned);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [onPinnedChange]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const navigation = navigationRef.current;
    if (!navigation) {
      return;
    }

    const focusableElements = () =>
      Array.from(
        navigation.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
    const firstFocusableElement = focusableElements()[0];
    firstFocusableElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobile();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const firstElement = elements[0];
      const lastElement = elements.at(-1);

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const expanded = mobileOpen || pinned || hovered;

  const togglePinned = () => {
    const nextPinned = !pinned;
    setPinned(nextPinned);
    onPinnedChange(nextPinned);
    window.localStorage.setItem(pinnedStorageKey, String(nextPinned));
  };

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Cerrar navegación"
          className={cn(['fixed inset-0 z-30 bg-overlay lg:hidden'])}
          onClick={onCloseMobile}
          type="button"
        />
      ) : null}
      <aside
        aria-label="Navegación principal"
        className={cn([
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface',
          'shadow-panel transition-[width,transform] duration-150 ease-out',
          mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full',
          'lg:translate-x-0',
          expanded ? 'lg:w-64' : 'lg:w-16',
        ])}
        ref={navigationRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setHovered(false);
          }
        }}
        onFocus={() => setHovered(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={cn([
            'flex h-16 shrink-0 items-center border-b border-border',
            expanded ? 'justify-between px-4' : 'justify-center px-2',
          ])}
        >
          {expanded ? (
            <Link
              aria-label="Ir al panel operativo"
              className={cn(['flex min-w-0 items-center'])}
              href="/app/dashboard"
              onClick={onCloseMobile}
            >
              <Image
                alt="Geedyx"
                className={cn(['h-auto w-8 dark:hidden'])}
                priority
                src={logoIconLight}
              />
              <Image
                alt="Geedyx"
                className={cn(['hidden h-auto w-8 dark:block'])}
                priority
                src={logoIconDark}
              />
              <span className={cn(['ml-3 text-sm font-semibold tracking-wide'])}>
                GEEDYX
              </span>
            </Link>
          ) : null}
          <button
            aria-label={pinned ? 'Compactar navegación' : 'Expandir navegación'}
            className={cn([
              'grid h-8 w-8 shrink-0 place-items-center rounded-full',
              'text-secondary transition hover:bg-surface-subtle hover:text-accent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              'lg:grid',
            ])}
            onClick={togglePinned}
            title={pinned ? 'Compactar navegación' : 'Expandir navegación'}
            type="button"
          >
            {pinned ? (
              <PanelLeftClose aria-hidden="true" className={cn(['h-4 w-4'])} />
            ) : (
              <PanelLeftOpen aria-hidden="true" className={cn(['h-4 w-4'])} />
            )}
          </button>
          {mobileOpen ? (
            <button
              aria-label="Cerrar navegación"
              className={cn([
                'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                'text-secondary transition hover:bg-surface-subtle hover:text-accent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                'lg:hidden',
              ])}
              onClick={onCloseMobile}
              type="button"
            >
              <X aria-hidden="true" className={cn(['h-4 w-4'])} />
            </button>
          ) : null}
        </div>

        <nav
          className={cn([
            'min-h-0 flex-1 overflow-y-auto px-2 py-4 space-y-1',
            expanded ? '' : 'scrollbar-hidden',
          ])}
        >
          {visibleNavigation.map((module) => {
            return (
              <section
                aria-label={module.label}
                className={cn(['space-y-1'])}
                key={module.key}
              >
                <div className={cn(['flex h-8 items-center px-3'])}>
                  {expanded ? (
                    <span
                      className={cn([
                        'text-xs font-semibold uppercase tracking-wide text-muted',
                      ])}
                    >
                      {module.label}
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(['h-px w-full bg-border'])}
                    />
                  )}
                </div>
                <div className={cn(['space-y-1'])}>
                  {module.items.map((item) => {
                    const itemActive = isNavigationItemActive(pathname, item.href);
                    const ItemIcon = item.icon;

                    return (
                      <Link
                        aria-current={itemActive ? 'page' : undefined}
                        aria-label={
                          expanded ? undefined : `${module.label}: ${item.label}`
                        }
                        className={cn([
                          'flex h-10 items-center rounded-full px-3 text-sm transition',
                          expanded ? 'gap-3' : 'justify-center',
                          itemActive
                            ? 'bg-surface-subtle font-medium text-accent'
                            : 'text-secondary hover:bg-surface-subtle hover:text-accent',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                        ])}
                        href={item.href}
                        key={item.href}
                        onClick={onCloseMobile}
                        title={expanded ? undefined : `${module.label}: ${item.label}`}
                      >
                        <ItemIcon
                          aria-hidden="true"
                          className={cn(['h-4 w-4 shrink-0'])}
                        />
                        {expanded ? (
                          <span className={cn(['truncate'])}>{item.label}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>

        <div className={cn(['shrink-0 border-t border-border px-4 py-3'])}>
          {expanded ? (
            <>
              <p className={cn(['text-xs text-muted'])}>Espacio de trabajo</p>
              <p className={cn(['mt-1 truncate text-xs font-medium'])}>
                {session.user.email}
              </p>
            </>
          ) : (
            <div aria-hidden="true" className={cn(['h-9'])} />
          )}
        </div>
      </aside>
    </>
  );
}
