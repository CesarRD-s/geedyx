export const PermissionCode = {
  CatalogRead: 'catalog.read',
  CatalogManage: 'catalog.manage',
  UsersRead: 'users.read',
  UsersManage: 'users.manage',
} as const;

export type PermissionCode =
  (typeof PermissionCode)[keyof typeof PermissionCode];

export function isPermissionCode(value: string): value is PermissionCode {
  return Object.values(PermissionCode).some((permission) => permission === value);
}

export const ALL_PERMISSION_CODES: readonly PermissionCode[] = [
  PermissionCode.CatalogRead,
  PermissionCode.CatalogManage,
  PermissionCode.UsersRead,
  PermissionCode.UsersManage,
];

export const SystemRoleCode = {
  Owner: 'OWNER',
  Admin: 'ADMIN',
  CatalogManager: 'CATALOG_MANAGER',
  Viewer: 'VIEWER',
} as const;

export type SystemRoleCode =
  (typeof SystemRoleCode)[keyof typeof SystemRoleCode];
