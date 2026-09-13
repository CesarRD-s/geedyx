import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SessionAuthGuard } from './session-auth.guard.js';

const token = 'session-token';
const hash = 'c85b5d5b9812bfa0ff3a626298ef9357d09bc5f0bc20a34e0ebd82f6c37db605';

function context(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe('SessionAuthGuard', () => {
  it('rejects a missing CSRF token for a mutation', async () => {
    const prisma = {
      session: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 's1',
            userId: 'u1',
            csrfTokenHash: hash,
            idleExpiresAt: new Date(Date.now() + 60_000),
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            user: { email: 'a@example.com', companyId: 'c1' },
          }),
        update: vi.fn(),
      },
    } as never;
    const guard = new SessionAuthGuard(prisma, {
      get: vi.fn().mockReturnValue('30m'),
    } as never);
    await expect(
      guard.canActivate(
        context({
          method: 'POST',
          cookies: { geedyx_session: token },
          header: vi.fn().mockReturnValue(undefined),
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a revoked session', async () => {
    const prisma = {
      session: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            revokedAt: new Date(),
            idleExpiresAt: new Date(Date.now() + 60_000),
            expiresAt: new Date(Date.now() + 60_000),
          }),
      },
    } as never;
    const guard = new SessionAuthGuard(prisma, {
      get: vi.fn().mockReturnValue('30m'),
    } as never);
    await expect(
      guard.canActivate(
        context({ method: 'GET', cookies: { geedyx_session: token } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
