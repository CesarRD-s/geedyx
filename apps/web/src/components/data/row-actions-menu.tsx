'use client';

import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '../../lib/cn';

export type RowActionItem = {
  Icon: LucideIcon;
  disabled?: boolean;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
};

type RowActionsMenuProps = {
  accessibleName: string;
  className?: string;
  items: RowActionItem[];
};

const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export function RowActionsMenu({
  accessibleName,
  className,
  items,
}: RowActionsMenuProps) {
  const menuId = useId();
  const triggerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    maxHeight: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !mounted) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.scrollHeight;
      const spaceBelow = Math.max(
        0,
        window.innerHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_PADDING,
      );
      const spaceAbove = Math.max(0, triggerRect.top - MENU_GAP - VIEWPORT_PADDING);
      const fitsBelow = spaceBelow >= menuHeight;
      const fitsAbove = spaceAbove >= menuHeight;
      const opensBelow = fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove);
      const availableHeight = opensBelow ? spaceBelow : spaceAbove;
      const maxHeight = Math.max(1, availableHeight);
      const visibleHeight = Math.min(menuHeight, maxHeight);
      const top = opensBelow
        ? triggerRect.bottom + MENU_GAP
        : triggerRect.top - visibleHeight - MENU_GAP;
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, triggerRect.right - menuWidth),
        window.innerWidth - menuWidth - VIEWPORT_PADDING,
      );

      setPosition({ left, maxHeight, top });
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const closeOnOutsideFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    updatePosition();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('focusin', closeOnOutsideFocus);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('focusin', closeOnOutsideFocus);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open || !position) return;
    itemRefs.current.find((item) => item && !item.disabled)?.focus();
  }, [open, position]);

  const closeMenu = () => {
    setOpen(false);
    setPosition(null);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn(['relative shrink-0', className ?? ''])} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={accessibleName}
        className={cn([
          'grid h-8 w-8 place-items-center rounded-lg border border-border',
          'bg-surface text-secondary transition hover:border-border-strong',
          'hover:bg-surface-subtle',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        ])}
        id={triggerId}
        onClick={() => {
          setPosition(null);
          setOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className={cn(['h-4 w-4'])} />
      </button>
      {mounted && open
        ? createPortal(
            <div
              aria-labelledby={triggerId}
              className={cn([
                'fixed z-[70] min-w-48 overflow-y-auto rounded-xl border border-border',
                'bg-surface shadow-xl',
              ])}
              id={menuId}
              ref={menuRef}
              role="menu"
              onKeyDown={(event) => {
                const enabledItems = itemRefs.current.filter(
                  (item): item is HTMLButtonElement => Boolean(item && !item.disabled),
                );
                const currentIndex = enabledItems.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const directions: Record<string, number> = {
                  ArrowDown: 1,
                  ArrowUp: -1,
                };
                const direction = directions[event.key];

                if (direction !== undefined && enabledItems.length > 0) {
                  event.preventDefault();
                  const nextIndex =
                    currentIndex < 0
                      ? direction > 0
                        ? 0
                        : enabledItems.length - 1
                      : (currentIndex + direction + enabledItems.length) %
                        enabledItems.length;
                  enabledItems[nextIndex]?.focus();
                  return;
                }

                if (event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  const item =
                    event.key === 'Home'
                      ? enabledItems[0]
                      : enabledItems[enabledItems.length - 1];
                  item?.focus();
                }
              }}
              style={{
                left: position?.left ?? -10000,
                maxHeight: position?.maxHeight ?? 320,
                top: position?.top ?? -10000,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {items.map(
                ({ Icon, disabled, label, onSelect, tone = 'default' }, index) => (
                  <button
                    className={cn([
                      'flex w-full items-center gap-2.5 px-3 py-2.5',
                      'text-left text-sm transition hover:bg-surface-subtle',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      tone === 'danger' ? 'text-danger' : 'text-foreground',
                    ])}
                    disabled={disabled}
                    key={label}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    onClick={() => {
                      closeMenu();
                      onSelect();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Icon aria-hidden="true" className={cn(['h-4 w-4 shrink-0'])} />
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
