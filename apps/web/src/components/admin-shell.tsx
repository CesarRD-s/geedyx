"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  X,
} from "lucide-react";
import { logout } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { navLinkClass } from "@/components/ui/styles";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Folder },
] as const;

const SECTION_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
};

interface AdminShellProps {
  user: AuthUser;
  children: ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sectionTitle = SECTION_TITLES[pathname] ?? "Administración";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <IconButton
            label="Abrir menú"
            tooltip="Abrir menú"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <h1 className="truncate text-base font-medium text-foreground">
            {sectionTitle}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle text-sm font-medium text-foreground">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {user.username}
                </p>
                <p className="max-w-48 truncate text-xs text-muted">
                  {user.email}
                </p>
              </div>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {drawerOpen && <MobileDrawer pathname={pathname} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-14 items-center border-b border-border px-4">
      <p className="text-base font-semibold tracking-tight text-foreground">
        GEEDYX
      </p>
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Principal">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const ItemIcon = item.icon;
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={navLinkClass(isActive)}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                ) : null}
                <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileDrawer({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-30 md:hidden" onKeyDown={handleKeyDown}>
      <div
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de administración"
        className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-panel"
      >
        <div className="flex h-14 items-center justify-between border-b border-border pl-4 pr-3">
          <p className="text-base font-semibold tracking-tight text-foreground">
            GEEDYX
          </p>
          <IconButton label="Cerrar menú" tooltip="Cerrar menú" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="flex-1 px-3 py-4">
          <NavLinks pathname={pathname} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}