import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RecentAuthenticationGuard } from './recent-authentication.guard.js';

function context() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1', sessionId: 'session-1' },
      }),
    }),
  } as never;
}

describe('RecentAuthenticationGuard', () => {
  it('allows a session inside the configured confirmation window', async () => {
    const guard = new RecentAuthenticationGuard(
      {
        session: {
          findFirst: vi.fn().mockResolvedValue({
            reauthenticatedAt: new Date(Date.now() - 60_000),
          }),
        },
      } as never,
      { get: vi.fn().mockReturnValue('10m') } as never,
    );

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('rejects a session outside the confirmation window', async () => {
    const guard = new RecentAuthenticationGuard(
      {
        session: {
          findFirst: vi.fn().mockResolvedValue({
            reauthenticatedAt: new Date(Date.now() - 11 * 60_000),
          }),
        },
      } as never,
      { get: vi.fn().mockReturnValue('10m') } as never,
    );

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
