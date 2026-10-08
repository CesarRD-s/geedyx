import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';

function createContext(
  request: object,
  response: object,
  handler: object,
): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard pending password change', () => {
  it('blocks protected requests until the required password change', async () => {
    const authService = {
      getSessionCookieName: () => 'session',
      resolveSession: vi.fn().mockResolvedValue({
        sessionId: 'session-1',
        user: { passwordChangeRequired: true },
      }),
    };
    const reflector = {
      get: vi.fn().mockReturnValue(false),
    };
    const request = {
      headers: { cookie: 'session=opaque-token' },
      method: 'GET',
    };
    const guard = new SessionGuard(
      authService as unknown as AuthService,
      reflector as unknown as Reflector,
    );

    await expect(
      guard.canActivate(createContext(request, {}, {})),
    ).rejects.toMatchObject({
      response: { code: 'PASSWORD_CHANGE_REQUIRED' },
      status: 403,
    });
  });

  it('allows the session and password endpoints needed to finish first access', async () => {
    const request = {
      headers: { cookie: 'session=opaque-token' },
      method: 'GET',
    };
    const authService = {
      getSessionCookieName: () => 'session',
      resolveSession: vi.fn().mockResolvedValue({
        sessionId: 'session-1',
        user: { passwordChangeRequired: true },
      }),
    };
    const reflector = {
      get: vi.fn().mockReturnValue(true),
    };
    const guard = new SessionGuard(
      authService as unknown as AuthService,
      reflector as unknown as Reflector,
    );

    await expect(guard.canActivate(createContext(request, {}, {}))).resolves.toBe(true);
    expect(request).toHaveProperty('auth');
  });
});
