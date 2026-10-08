export type ApiMeta = {
  requestId: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ProblemFieldError = {
  field?: string;
  code: string;
  message: string;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  requestId: string;
  errors?: ProblemFieldError[];
  sessionManagement?: SessionManagementDetails;
};

export type ActiveSession = {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
};

export type SessionManagementDetails = {
  token: string;
  sessions: ActiveSession[];
};

export type InstallationStatus = 'PENDING' | 'COMPLETED';

export type SetupStatus = {
  installationStatus: InstallationStatus;
  ready: boolean;
};

export type OwnerCreated = {
  owner: {
    id: string;
    displayName: string;
    email: string;
  };
  installationStatus: 'COMPLETED';
};

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  passwordChangeRequired: boolean;
  language: 'es' | 'en' | null;
  timeZone: string | null;
  effectiveLanguage: 'es' | 'en';
  effectiveTimeZone: string | null;
  roles: string[];
  roleNames: string[];
  permissions: string[];
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export type ManagedUser = {
  id: string;
  displayName: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  passwordChangeRequired: boolean;
  roles: string[];
  roleNames: string[];
  createdAt: string;
};

export type UsersResponse = {
  users: ManagedUser[];
  pagination: PaginationMeta;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  memberCount: number;
};

export type PermissionOption = {
  code: string;
  moduleKey: string;
  moduleLabel: string;
  label: string;
  description: string;
  assignable: boolean;
};

export type RolesResponse = {
  roles: RoleSummary[];
  permissions: PermissionOption[];
};

export type ManagedSession = ActiveSession & {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  revokedAt: string | null;
  revokedReason: string | null;
};

export type SessionsResponse = {
  sessions: ManagedSession[];
};

export type CompanyConfiguration = {
  id: string;
  name: string;
  logoUrl: string | null;
  country: string | null;
  locale: string;
  timeZone: string | null;
  currency: string | null;
  dateFormat: string;
  timeFormat: string;
  isComplete: boolean;
};

export type CategorySummary = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  archivedAt: string | null;
};

export type CategoriesResponse = {
  categories: CategorySummary[];
  pagination: PaginationMeta;
};

export type ProductSummary = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  visibility: 'INTERNAL' | 'PUBLIC';
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    priceCents: number;
    status: 'ACTIVE' | 'ARCHIVED';
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ProductsResponse = {
  products: ProductSummary[];
  pagination: PaginationMeta;
};

export type AuditEventSummary = {
  id: string;
  module: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE';
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  actorDisplayName: string | null;
  requestId: string | null;
  metadata: unknown;
  occurredAt: string;
};

export type AuditResponse = {
  events: AuditEventSummary[];
  total: number;
  pagination: PaginationMeta;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type UserPreferences = {
  language: 'es' | 'en' | null;
  timeZone: string | null;
  effectiveLanguage: 'es' | 'en';
  effectiveTimeZone: string | null;
  companyLanguage: 'es' | 'en';
  companyTimeZone: string | null;
};

export type UserCreated = {
  user: ManagedUser;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
};

export type TemporaryPasswordIssued = {
  user: ManagedUser;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
};

export type UserUpdated = {
  user: ManagedUser;
};

export type PasswordChanged = {
  passwordChanged: true;
};

export type CsrfToken = {
  token: string;
};

export type LogoutResult = {
  loggedOut: true;
};
