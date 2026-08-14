import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaProducerService, KafkaNotificationDeliveredOutput, KAFKA_TOPIC_NOTIFICATION_DLQ } from '@perc/shared';
import { NotificationRecord } from '../interfaces/notification.interface';

@Injectable()
export class NotificationKafkaPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationKafkaPublisherService.name);
  private producer: KafkaProducerService;

  constructor() {
    this.producer = new KafkaProducerService({
      clientId: 'perc-notification-engine-publisher',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Notification Engine Kafka Publisher initialized.');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  /**
   * Broadcasts that a notification was successfully delivered & saved.
   * Consumed by Timeline Engine (Engine 5), Analytics Engine (Engine 9), and Frontend SSE/WebSockets.
   * Topic: perc.notification.notification-delivered
   */
  async broadcastNotificationDelivered(record: NotificationRecord): Promise<void> {
    const outputPayload: KafkaNotificationDeliveredOutput = {
      eventId: record.id,
      eventType: 'NOTIFICATION_DELIVERED',
      notificationId: record.id,
      userId: record.userId,
      leadId: record.leadId,
      notificationType: record.notificationType,
      priority: record.priority,
      title: record.title,
      message: record.message,
      actionUrl: record.actionUrl,
      isRead: record.isRead,
      metadata: record.metadata || {},
      deliveredAt: new Date().toISOString(),
      occurredAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
    };

    try {
      const result = await this.producer.publishNotificationDelivered(outputPayload);
      if (result.success) {
        this.logger.log(
          `[Kafka Outbox] Emitted NOTIFICATION_DELIVERED for User: ${record.userId}, Priority: ${record.priority}, Type: ${record.notificationType}`,
        );
      } else {
        this.logger.warn(`[Kafka Outbox] Broadcast warning: ${result.error}`);
      }
    } catch (err: any) {
      this.logger.error(`[Kafka Outbox] Failed to broadcast notification: ${err.message}`);
    }
  }

  /**
   * Dispatches invalid/malformed command messages to DLQ
   * Topic: perc.notification.commands.dlq
   */
  async publishToDlq(topic: string, reason: string, rawPayload: any): Promise<void> {
    try {
      await this.producer.sendMessage(KAFKA_TOPIC_NOTIFICATION_DLQ, rawPayload?.userId || 'dlq', {
        originalTopic: topic,
        errorReason: reason,
        rawPayload,
        failedAt: new Date().toISOString(),
      });
      this.logger.warn(`[Kafka DLQ] Dispatched malformed command to '${KAFKA_TOPIC_NOTIFICATION_DLQ}' (Reason: ${reason})`);
    } catch (err: any) {
      this.logger.error(`[Kafka DLQ] Failed to route to DLQ: ${err.message}`);
    }
  }

  getProducer(): KafkaProducerService {
    return this.producer;
  }
}
