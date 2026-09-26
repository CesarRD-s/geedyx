import type { AuthSession } from '@geedyx/contracts';
import type { Request } from 'express';
import type { RequestWithId } from '../http/request-id.middleware';

export type AuthenticatedContext = AuthSession & {
  sessionId: string;
};

export type AuthenticatedRequest = RequestWithId &
  Request & {
    auth?: AuthenticatedContext;
  };
