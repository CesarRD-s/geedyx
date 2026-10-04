'use client';

import type { AuthSession } from '@geedyx/contracts';
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import logoIconDark from '../../assets/geedyx-logo-icon-dark.png';
import logoIconLight from '../../assets/geedyx-logo-icon-light.png';
import { getVisibleNavigation, isNavigationItemActive } from './navigation-config';
import { cn } from '../../lib/cn';

const pinnedStorageKey = 'geedyx.navigation.pinned';
const groupsStorageKey = 'geedyx.navigation.groups';

type AppNavigationProps = {
  session: AuthSession;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onPinnedChange: (pinned: boolean) => void;
};

function readStoredGroups(): string[] {
  try {
    const value = window.localStorage.getItem(groupsStorageKey);
    const groups = value ? JSON.parse(value) : [];
    return Array.isArray(groups)
      ? groups.filter((group) => typeof group === 'string')
      : [];
  } catch {
    return [];
  }
}

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
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedPinned = window.localStorage.getItem(pinnedStorageKey) === 'true';
      setPinned(storedPinned);
      onPinnedChange(storedPinned);
      setOpenGroups(readStoredGroups());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [onPinnedChange]);

  useEffect(() => {
    const activeModule = visibleNavigation.find((module) =>
      module.items.some((item) => isNavigationItemActive(pathname, item.href)),
    );

    if (activeModule && !openGroups.includes(activeModule.key)) {
      const frame = window.requestAnimationFrame(() => {
        setOpenGroups((groups) => [...groups, activeModule.key]);
      });

      return () => window.cancelAnimationFrame(frame);
    }
  }, [openGroups, pathname, visibleNavigation]);

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

  const toggleGroup = (key: string) => {
    setOpenGroups((groups) => {
      const nextGroups = groups.includes(key)
        ? groups.filter((group) => group !== key)
        : [...groups, key];
      window.localStorage.setItem(groupsStorageKey, JSON.stringify(nextGroups));
      return nextGroups;
    });
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
            'min-h-0 flex-1 overflow-y-auto px-2 py-4',
            expanded ? 'space-y-1' : 'space-y-2',
          ])}
        >
          {visibleNavigation.map((module) => {
            const ModuleIcon = module.icon;
            const active = module.items.some((item) =>
              isNavigationItemActive(pathname, item.href),
            );
            const isDirect = module.items.length === 1;
            const groupOpen = openGroups.includes(module.key);

            if (isDirect) {
              const item = module.items[0];
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  aria-label={module.label}
                  className={cn([
                    'flex items-center rounded-full text-sm transition',
                    expanded ? 'gap-3 px-3 py-2' : 'justify-center p-3',
                    active
                      ? 'bg-surface-subtle font-medium text-accent'
                      : 'text-secondary hover:bg-surface-subtle hover:text-accent',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                  ])}
                  href={item.href}
                  key={module.key}
                  onClick={onCloseMobile}
                  title={expanded ? undefined : module.label}
                >
                  <ModuleIcon aria-hidden="true" className={cn(['h-4 w-4 shrink-0'])} />
                  {expanded ? (
                    <span className={cn(['truncate'])}>{item.label}</span>
                  ) : null}
                </Link>
              );
            }

            return (
              <div key={module.key} className={cn(['space-y-1'])}>
                <button
                  aria-expanded={expanded ? groupOpen : undefined}
                  aria-label={module.label}
                  className={cn([
                    'flex w-full items-center rounded-full text-left text-sm transition',
                    expanded ? 'gap-3 px-3 py-2' : 'justify-center p-3',
                    active
                      ? 'bg-surface-subtle font-medium text-accent'
                      : 'text-secondary hover:bg-surface-subtle hover:text-accent',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                  ])}
                  onClick={() => {
                    if (!expanded) {
                      setHovered(true);
                      return;
                    }
                    toggleGroup(module.key);
                  }}
                  onFocus={() => {
                    setHovered(true);
                    if (!expanded && !openGroups.includes(module.key)) {
                      setOpenGroups((groups) => {
                        const nextGroups = [...groups, module.key];
                        window.localStorage.setItem(
                          groupsStorageKey,
                          JSON.stringify(nextGroups),
                        );
                        return nextGroups;
                      });
                    }
                  }}
                  title={expanded ? undefined : module.label}
                  type="button"
                >
                  <ModuleIcon aria-hidden="true" className={cn(['h-4 w-4 shrink-0'])} />
                  {expanded ? (
                    <span className={cn(['min-w-0 flex-1 truncate'])}>
                      {module.label}
                    </span>
                  ) : null}
                  {expanded ? (
                    groupOpen ? (
                      <ChevronDown aria-hidden="true" className={cn(['h-4 w-4'])} />
                    ) : (
                      <ChevronRight aria-hidden="true" className={cn(['h-4 w-4'])} />
                    )
                  ) : null}
                </button>
                {expanded && groupOpen ? (
                  <div className={cn(['ml-4 space-y-1 border-l border-border pl-3'])}>
                    {module.items.map((item) => {
                      const itemActive = isNavigationItemActive(pathname, item.href);
                      return (
                        <Link
                          aria-current={itemActive ? 'page' : undefined}
                          className={cn([
                            'block rounded-full px-3 py-2 text-sm transition',
                            itemActive
                              ? 'bg-surface-subtle font-medium text-accent'
                              : 'text-secondary hover:bg-surface-subtle hover:text-accent',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                          ])}
                          href={item.href}
                          key={item.href}
                          onClick={onCloseMobile}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {expanded ? (
          <div className={cn(['shrink-0 border-t border-border px-4 py-3'])}>
            <p className={cn(['text-xs text-muted'])}>Espacio de trabajo</p>
            <p className={cn(['mt-1 truncate text-xs font-medium'])}>
              {session.user.email}
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
