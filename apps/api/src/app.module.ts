import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { ProductsModule } from './products/products.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    SetupModule,
    UsersModule,
    ConfigurationModule,
    ProductsModule,
    AuditModule,
  ],
})
export class AppModule {}
