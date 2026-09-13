import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { SessionAuthGuard } from './session-auth.guard.js';

const token = 'session-token';
const hash = createHash('sha256').update(token).digest('hex');

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
      get: vi.fn((key: string, fallback: string) =>
        key === 'CORS_ORIGINS' ? 'http://localhost:3000' : fallback,
      ),
    } as never);
    await expect(
      guard.canActivate(
        context({
          method: 'POST',
          cookies: { geedyx_session: token },
          header: vi.fn((name: string) =>
            name === 'origin' ? 'http://localhost:3000' : undefined,
          ),
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a mutation from an unapproved origin before CSRF validation', async () => {
    const prisma = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
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
      get: vi.fn((key: string, fallback: string) =>
        key === 'CORS_ORIGINS' ? 'http://localhost:3000' : fallback,
      ),
    } as never);

    await expect(
      guard.canActivate(
        context({
          method: 'POST',
          cookies: { geedyx_session: token },
          header: vi.fn((name: string) =>
            name === 'origin' ? 'https://attacker.example' : token,
          ),
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('accepts an approved origin with the session-bound CSRF token', async () => {
    const update = vi.fn();
    const prisma = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
          id: 's1',
          userId: 'u1',
          csrfTokenHash: hash,
          idleExpiresAt: new Date(Date.now() + 60_000),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null,
          user: { email: 'a@example.com', companyId: 'c1' },
        }),
        update,
      },
    } as never;
    const guard = new SessionAuthGuard(prisma, {
      get: vi.fn((key: string, fallback: string) =>
        key === 'CORS_ORIGINS' ? 'http://localhost:3000' : fallback,
      ),
    } as never);
    const request = {
      method: 'POST',
      cookies: { geedyx_session: token },
      header: vi.fn((name: string) =>
        name === 'origin' ? 'http://localhost:3000' : token,
      ),
    };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(update).toHaveBeenCalledOnce();
    expect(request).toHaveProperty('user.sessionId', 's1');
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
