"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  X,
} from "lucide-react";
import { logout } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { navLinkClass } from "@/components/ui/styles";

const NAV_ITEMS = [
  { href: "/app", label: "Panel", icon: LayoutDashboard },
  { href: "/app/products", label: "Productos", icon: Package },
  { href: "/app/categories", label: "Categorías", icon: Folder },
] as const;

const SECTION_TITLES: Record<string, string> = {
  "/app": "Panel",
  "/app/products": "Productos",
  "/app/categories": "Categorías",
};

const SIDEBAR_STORAGE_KEY = "geedyx-sidebar-collapsed";

interface WorkspaceShellProps {
  user: AuthUser;
  children: ReactNode;
}

export function WorkspaceShell({ user, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sectionTitle = SECTION_TITLES[pathname] ?? "Administración";

  useEffect(() => {
    const savedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedValue === "true") {
      window.setTimeout(() => setSidebarCollapsed(true), 0);
    }
  }, []);

  function toggleSidebar(): void {
    setSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue));
      return nextValue;
    });
  }

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
      <aside className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-surface md:flex ${sidebarCollapsed ? "w-16" : "w-60"}`}>
        <Brand collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          <NavLinks pathname={pathname} collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}>
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
              className="flex items-center gap-2 text-sm font-medium text-foreground"
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

function Brand({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <div className="flex h-14 items-center justify-center border-b border-border px-2">
        <IconButton
          label="Expandir menú"
          tooltip="Expandir menú"
          aria-expanded={false}
          onClick={onToggle}
          className="p-1.5"
        >
          <BrandLogo compact priority />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-border pl-4 pr-2">
      <BrandLogo priority />
      <IconButton
        label="Contraer menú"
        tooltip="Contraer menú"
        aria-expanded={true}
        onClick={onToggle}
      >
        <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
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
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={`${navLinkClass(isActive)} ${collapsed ? "justify-center px-2" : ""}`}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                ) : null}
                <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
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
          <BrandLogo priority />
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
