import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccountStatusGuard } from './guards/account-status.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RecentAuthenticationGuard } from './guards/recent-authentication.guard.js';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    AccountStatusGuard,
    PermissionsGuard,
    RecentAuthenticationGuard,
  ],
  exports: [
    SessionAuthGuard,
    AccountStatusGuard,
    PermissionsGuard,
    RecentAuthenticationGuard,
  ],
})
export class AuthModule {}
