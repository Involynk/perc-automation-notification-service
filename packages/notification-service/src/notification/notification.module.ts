import { Module } from '@nestjs/common';
import { NotificationController } from './controller/notification.controller';
import { NotificationService } from './service/notification.service';
import { NotificationConsumerService } from './consumer/notification-consumer.service';
import { PreferenceService } from './preference/preference.service';
import { NotificationRepository } from './repository/notification.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationConsumerService,
    PreferenceService,
    NotificationRepository,
    PrismaService,
  ],
  exports: [NotificationService, NotificationConsumerService, PrismaService],
})
export class NotificationModule {}
