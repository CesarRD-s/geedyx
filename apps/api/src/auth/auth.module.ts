import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PermissionGuard, SessionGuard],
  exports: [AuthService, PermissionGuard, SessionGuard],
})
export class AuthModule {}
