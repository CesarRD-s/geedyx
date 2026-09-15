import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailDeliveryService } from './email-delivery.service.js';

@Module({
  imports: [PrismaModule],
  providers: [EmailDeliveryService],
  exports: [EmailDeliveryService],
})
export class NotificationsModule {}
