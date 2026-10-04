import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';

@Module({
  controllers: [ConfigurationController],
  imports: [AuthModule],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
