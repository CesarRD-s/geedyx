import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccountStatusGuard } from './guards/account-status.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { durationToSeconds } from './duration.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * The env file could define JWT_SECRET as an empty string; an empty string is
 * a present value for ConfigService, so getOrThrow alone would not catch it.
 * Refuse to boot instead of silently signing tokens with an empty secret.
 */
function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET is required. Set a strong random value (e.g. `openssl rand -hex 32`) in the API environment.',
    );
  }
  return secret;
}

@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecret(config),
        signOptions: {
          expiresIn: durationToSeconds(
            config.get<string>('JWT_EXPIRES_IN', '1h'),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AccountStatusGuard, PermissionsGuard],
  exports: [JwtAuthGuard, AccountStatusGuard, PermissionsGuard, PassportModule],
})
export class AuthModule {}
