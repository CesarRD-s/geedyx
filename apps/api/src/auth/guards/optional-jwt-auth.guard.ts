import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Passport JWT guard that treats a missing/invalid session cookie as an
 * anonymous request instead of failing with 401. When a valid cookie exists,
 * `req.user` is set by the underlying guard; otherwise it stays undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await this.jwtAuthGuard.canActivate(context);
    } catch {
      // Anonymous access is allowed.
    }
    return true;
  }
}