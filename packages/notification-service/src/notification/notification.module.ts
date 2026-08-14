import { Module } from '@nestjs/common';
import { NotificationController } from './controller/notification.controller';
import { NotificationService } from './service/notification.service';
import { PreferenceService } from './service/preference.service';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationKafkaPublisherService } from './kafka/notification-kafka-publisher.service';
import { NotificationKafkaConsumerService } from './kafka/notification-kafka-consumer.service';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PreferenceService,
    NotificationRepository,
    NotificationKafkaPublisherService,
    NotificationKafkaConsumerService,
  ],
  exports: [
    NotificationService,
    PreferenceService,
    NotificationRepository,
    NotificationKafkaPublisherService,
    NotificationKafkaConsumerService,
  ],
})
export class NotificationModule {}
