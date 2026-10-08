import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  Boxes,
  ClipboardList,
  Contact,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission?: string;
};

export type NavigationModule = {
  key: string;
  label: string;
  items: NavigationItem[];
};

export const appNavigation: NavigationModule[] = [
  {
    items: [
      {
        href: '/app/dashboard',
        icon: LayoutDashboard,
        label: 'Panel operativo',
        permission: 'dashboard.read',
      },
    ],
    key: 'dashboard',
    label: 'Panel operativo',
  },
  {
    items: [
      {
        href: '/app/sales',
        icon: ShoppingCart,
        label: 'Ventas',
        permission: 'sales.read',
      },
      {
        href: '/app/sales/receipts',
        icon: Receipt,
        label: 'Comprobantes',
        permission: 'sales.read',
      },
      {
        href: '/app/sales/payments',
        icon: CreditCard,
        label: 'Pagos',
        permission: 'payments.read',
      },
    ],
    key: 'sales',
    label: 'Ventas',
  },
  {
    items: [
      {
        href: '/app/products',
        icon: Package,
        label: 'Productos',
        permission: 'products.read',
      },
      {
        href: '/app/products/categories',
        icon: Tags,
        label: 'Categorías',
        permission: 'products.read',
      },
    ],
    key: 'catalog',
    label: 'Catálogo',
  },
  {
    items: [
      {
        href: '/app/inventory',
        icon: Boxes,
        label: 'Existencias',
        permission: 'inventory.read',
      },
      {
        href: '/app/inventory/movements',
        icon: ArrowLeftRight,
        label: 'Movimientos',
        permission: 'inventory.read',
      },
    ],
    key: 'inventory',
    label: 'Inventario',
  },
  {
    items: [
      {
        href: '/app/customers',
        icon: Contact,
        label: 'Clientes',
        permission: 'customers.read',
      },
      {
        href: '/app/suppliers',
        icon: Store,
        label: 'Proveedores',
        permission: 'suppliers.read',
      },
    ],
    key: 'contacts',
    label: 'Clientes y proveedores',
  },
  {
    items: [
      {
        href: '/app/reports',
        icon: BarChart3,
        label: 'Reportes operativos',
        permission: 'reports.read',
      },
    ],
    key: 'reports',
    label: 'Reportes',
  },
  {
    items: [
      {
        href: '/app/users',
        icon: Users,
        label: 'Usuarios',
        permission: 'users.read',
      },
    ],
    key: 'users',
    label: 'Usuarios',
  },
  {
    items: [
      {
        href: '/app/users/roles',
        icon: KeyRound,
        label: 'Perfiles de acceso',
        permission: 'roles.manage',
      },
      {
        href: '/app/security/sessions',
        icon: Shield,
        label: 'Sesiones',
        permission: 'sessions.read',
      },
    ],
    key: 'security',
    label: 'Seguridad',
  },
  {
    items: [
      {
        href: '/app/audit',
        icon: ClipboardList,
        label: 'Registro de auditoría',
        permission: 'audit.read',
      },
    ],
    key: 'audit',
    label: 'Auditoría',
  },
  {
    items: [
      {
        href: '/app/configuration/company',
        icon: Building2,
        label: 'Empresa',
        permission: 'configuration.read',
      },
      {
        href: '/app/configuration/preferences',
        icon: Settings,
        label: 'Preferencias',
        permission: 'configuration.read',
      },
    ],
    key: 'configuration',
    label: 'Configuración',
  },
];

export function getVisibleNavigation(permissions: string[]): NavigationModule[] {
  return appNavigation
    .map((navigationModule) => ({
      ...navigationModule,
      items: navigationModule.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((navigationModule) => navigationModule.items.length > 0);
}

export function isNavigationItemActive(pathname: string, href: string): boolean {
  const matchesPath = (candidate: string) =>
    pathname === candidate || pathname.startsWith(`${candidate}/`);

  if (!matchesPath(href)) {
    return false;
  }

  const hasMoreSpecificMatch = appNavigation.some((navigationModule) =>
    navigationModule.items.some(
      (item) =>
        item.href !== href && item.href.length > href.length && matchesPath(item.href),
    ),
  );

  return !hasMoreSpecificMatch;
}

export function getNavigationTitle(pathname: string): string {
  for (const navigationModule of appNavigation) {
    const item = navigationModule.items.find((entry) =>
      isNavigationItemActive(pathname, entry.href),
    );

    if (item) {
      return item.label;
    }
  }

  return 'Panel operativo';
}

export function getNavigationSection(pathname: string): string {
  for (const navigationModule of appNavigation) {
    if (
      navigationModule.items.some((item) => isNavigationItemActive(pathname, item.href))
    ) {
      return navigationModule.label;
    }
  }

  return 'Panel operativo';
}

export function getNavigationDescription(pathname: string): string {
  if (pathname === '/app/dashboard' || pathname === '/app') {
    return 'Resumen de la operación y accesos rápidos.';
  }

  return 'Administra esta sección de Geedyx desde un espacio de trabajo organizado.';
}
