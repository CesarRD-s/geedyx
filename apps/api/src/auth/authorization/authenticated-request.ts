import type { PermissionCode } from './permissions.js';
import type { RequestWithId } from '../../http/request-context.middleware.js';

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  companyId: string;
  sessionId?: string;
  permissions: PermissionCode[];
}

export interface AuthenticatedRequest extends RequestWithId {
  user: AuthenticatedRequestUser;
}
