import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  permission?: string;
};

export type NavigationModule = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
};

export const appNavigation: NavigationModule[] = [
  {
    icon: LayoutDashboard,
    items: [
      {
        href: '/app/dashboard',
        label: 'Panel operativo',
        permission: 'dashboard.read',
      },
    ],
    key: 'dashboard',
    label: 'Panel operativo',
  },
  {
    icon: ShoppingCart,
    items: [
      {
        href: '/app/sales',
        label: 'Ventas',
        permission: 'sales.read',
      },
      {
        href: '/app/sales/receipts',
        label: 'Comprobantes',
        permission: 'sales.read',
      },
      {
        href: '/app/sales/payments',
        label: 'Pagos',
        permission: 'payments.read',
      },
    ],
    key: 'sales',
    label: 'Ventas',
  },
  {
    icon: Package,
    items: [
      {
        href: '/app/products',
        label: 'Productos',
        permission: 'products.read',
      },
      {
        href: '/app/products/categories',
        label: 'Categorías',
        permission: 'products.read',
      },
    ],
    key: 'catalog',
    label: 'Catálogo',
  },
  {
    icon: Boxes,
    items: [
      {
        href: '/app/inventory',
        label: 'Existencias',
        permission: 'inventory.read',
      },
      {
        href: '/app/inventory/movements',
        label: 'Movimientos',
        permission: 'inventory.read',
      },
    ],
    key: 'inventory',
    label: 'Inventario',
  },
  {
    icon: Store,
    items: [
      {
        href: '/app/customers',
        label: 'Clientes',
        permission: 'customers.read',
      },
      {
        href: '/app/suppliers',
        label: 'Proveedores',
        permission: 'suppliers.read',
      },
    ],
    key: 'contacts',
    label: 'Clientes y proveedores',
  },
  {
    icon: BarChart3,
    items: [
      {
        href: '/app/reports',
        label: 'Reportes operativos',
        permission: 'reports.read',
      },
    ],
    key: 'reports',
    label: 'Reportes',
  },
  {
    icon: Users,
    items: [
      {
        href: '/app/users',
        label: 'Usuarios',
        permission: 'users.read',
      },
    ],
    key: 'users',
    label: 'Usuarios',
  },
  {
    icon: Shield,
    items: [
      {
        href: '/app/users/roles',
        label: 'Roles y permisos',
        permission: 'roles.manage',
      },
      {
        href: '/app/security/sessions',
        label: 'Sesiones',
        permission: 'sessions.read',
      },
    ],
    key: 'security',
    label: 'Seguridad',
  },
  {
    icon: ClipboardList,
    items: [
      {
        href: '/app/audit',
        label: 'Registro de auditoría',
        permission: 'audit.read',
      },
    ],
    key: 'audit',
    label: 'Auditoría',
  },
  {
    icon: Settings,
    items: [
      {
        href: '/app/configuration/company',
        label: 'Empresa',
        permission: 'configuration.read',
      },
      {
        href: '/app/configuration/preferences',
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
  return pathname === href || pathname.startsWith(`${href}/`);
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
