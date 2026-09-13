import type { RequestWithId } from '../http/request-context.middleware.js';
import type { AuditRequestContext } from './audit.service.js';

export function requestAuditContext(
  request: RequestWithId,
): AuditRequestContext {
  const userAgent = request.header('user-agent');
  return {
    requestId: request.requestId,
    ipAddress: request.ip || request.socket.remoteAddress || 'unknown',
    ...(userAgent ? { userAgent } : {}),
  };
}
