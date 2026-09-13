import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { durationToMs } from './duration.js';

export type AuthRateLimitScope =
  | 'setup'
  | 'login'
  | 'reauthenticate'
  | 'change-password'
  | 'reset-request'
  | 'reset-password';

@Injectable()
export class DurableRateLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async consume(
    scope: AuthRateLimitScope,
    subjects: readonly string[],
  ): Promise<void> {
    for (const subject of subjects) {
      await this.consumeSubject(scope, subject);
    }
  }

  private async consumeSubject(
    scope: AuthRateLimitScope,
    subject: string,
  ): Promise<void> {
    const now = new Date();
    const windowMs = durationToMs(
      this.config.get<string>('AUTH_RATE_LIMIT_WINDOW', '1m'),
    );
    const limit = this.config.get<number>('AUTH_RATE_LIMIT_ATTEMPTS', 5);
    const keyHash = createHash('sha256').update(subject).digest('hex');

    await this.prisma.rateLimitBucket.deleteMany({
      where: {
        scope,
        keyHash,
        OR: [
          { blockedUntil: { lte: now } },
          { blockedUntil: null, expiresAt: { lte: now } },
        ],
      },
    });
    const bucket = await this.prisma.rateLimitBucket.upsert({
      where: { scope_keyHash: { scope, keyHash } },
      create: {
        scope,
        keyHash,
        totalHits: 1,
        expiresAt: new Date(now.getTime() + windowMs),
      },
      update: { totalHits: { increment: 1 } },
      select: { totalHits: true, blockedUntil: true },
    });

    if (bucket.blockedUntil && bucket.blockedUntil > now) {
      throw new ThrottlerException('Too many requests');
    }
    if (bucket.totalHits > limit) {
      await this.prisma.rateLimitBucket.update({
        where: { scope_keyHash: { scope, keyHash } },
        data: { blockedUntil: new Date(now.getTime() + windowMs) },
      });
      throw new ThrottlerException('Too many requests');
    }
  }
}
