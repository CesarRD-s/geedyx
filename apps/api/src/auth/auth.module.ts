import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccountStatusGuard } from './guards/account-status.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RecentAuthenticationGuard } from './guards/recent-authentication.guard.js';
import { PasswordResetDeliveryService } from './password-reset-delivery.service.js';
import { DurableRateLimitService } from './durable-rate-limit.service.js';
import { AuditModule } from '../audit/audit.module.js';

@Global()
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    AccountStatusGuard,
    PermissionsGuard,
    RecentAuthenticationGuard,
    PasswordResetDeliveryService,
    DurableRateLimitService,
  ],
  exports: [
    SessionAuthGuard,
    AccountStatusGuard,
    PermissionsGuard,
    RecentAuthenticationGuard,
  ],
})
export class AuthModule {}
