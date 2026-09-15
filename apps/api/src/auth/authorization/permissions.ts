export const PermissionCode = {
  CatalogRead: 'catalog.read',
  CatalogManage: 'catalog.manage',
  UsersRead: 'users.read',
  UsersManage: 'users.manage',
  CompanyManage: 'company.manage',
} as const;

export type PermissionCode =
  (typeof PermissionCode)[keyof typeof PermissionCode];

export function isPermissionCode(value: string): value is PermissionCode {
  return Object.values(PermissionCode).some(
    (permission) => permission === value,
  );
}

export const ALL_PERMISSION_CODES: readonly PermissionCode[] = [
  PermissionCode.CatalogRead,
  PermissionCode.CatalogManage,
  PermissionCode.UsersRead,
  PermissionCode.UsersManage,
  PermissionCode.CompanyManage,
];

export const SystemRoleCode = {
  Owner: 'OWNER',
  Admin: 'ADMIN',
  CatalogManager: 'CATALOG_MANAGER',
  Viewer: 'VIEWER',
} as const;

export type SystemRoleCode =
  (typeof SystemRoleCode)[keyof typeof SystemRoleCode];

export interface SystemRoleDefinition {
  code: SystemRoleCode;
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
}

export const SYSTEM_ROLE_DEFINITIONS: readonly SystemRoleDefinition[] = [
  {
    code: SystemRoleCode.Owner,
    name: 'Propietario',
    description: 'Acceso total e inmutable a la empresa',
    permissions: ALL_PERMISSION_CODES,
  },
  {
    code: SystemRoleCode.Admin,
    name: 'Administrador',
    description: 'Gestiona la configuración, el catálogo y los usuarios internos',
    permissions: ALL_PERMISSION_CODES,
  },
  {
    code: SystemRoleCode.CatalogManager,
    name: 'Gestor de catálogo',
    description: 'Gestiona productos y categorías',
    permissions: [PermissionCode.CatalogRead, PermissionCode.CatalogManage],
  },
  {
    code: SystemRoleCode.Viewer,
    name: 'Consulta',
    description: 'Consulta el catálogo interno',
    permissions: [PermissionCode.CatalogRead],
  },
];
