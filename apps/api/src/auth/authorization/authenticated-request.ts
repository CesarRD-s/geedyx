import type { Request } from 'express';
import type { PermissionCode } from './permissions.js';

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  companyId: string;
  permissions: PermissionCode[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedRequestUser;
}
