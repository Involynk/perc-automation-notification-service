import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import {
  KAFKA_TOPIC_NOTIFICATION_SEND,
  KAFKA_TOPIC_NOTIFICATION_BROADCAST,
  KAFKA_GROUP_NOTIFICATION_ENGINE,
  KafkaNotificationSendInput,
  KafkaNotificationBroadcastInput,
} from '@perc/shared';
import { NotificationService } from '../service/notification.service';
import { NotificationKafkaPublisherService } from './notification-kafka-publisher.service';

@Injectable()
export class NotificationKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationKafkaConsumerService.name);
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private isRunning = false;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly publisher: NotificationKafkaPublisherService,
  ) {
    const brokersEnv = process.env.KAFKA_BROKERS;
    const brokers = brokersEnv ? brokersEnv.split(',') : ['localhost:9092'];
    const enabled = process.env.KAFKA_ENABLED === 'true' || !!brokersEnv;

    if (enabled) {
      try {
        this.kafka = new Kafka({
          clientId: 'perc-notification-engine-consumer',
          brokers,
          retry: { initialRetryTime: 100, retries: 5 },
        });
        this.consumer = this.kafka.consumer({
          groupId: process.env.KAFKA_GROUP_ID || KAFKA_GROUP_NOTIFICATION_ENGINE,
        });
      } catch (err: any) {
        this.logger.warn(`Kafka client init warning: ${err.message}`);
      }
    }
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  async start(): Promise<void> {
    if (this.consumer && !this.isRunning) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topics: [KAFKA_TOPIC_NOTIFICATION_SEND, KAFKA_TOPIC_NOTIFICATION_BROADCAST],
          fromBeginning: false,
        });

        this.isRunning = true;
        this.logger.log(`[Kafka Consumer] Subscribed to [${KAFKA_TOPIC_NOTIFICATION_SEND}, ${KAFKA_TOPIC_NOTIFICATION_BROADCAST}]`);

        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            const rawValue = message.value?.toString();
            const key = message.key?.toString();
            this.logger.log(`[Kafka Inbound] Topic: ${topic} | Partition: ${partition} | Key: ${key}`);

            if (!rawValue) return;

            try {
              const payload = JSON.parse(rawValue);
              if (topic === KAFKA_TOPIC_NOTIFICATION_SEND) {
                await this.processSendNotification(payload, topic);
              } else if (topic === KAFKA_TOPIC_NOTIFICATION_BROADCAST) {
                await this.processBroadcastNotification(payload, topic);
              }
            } catch (err: any) {
              this.logger.error(`[Kafka Error] Failed to process message from ${topic}: ${err.message}`);
              await this.publisher.publishToDlq(topic, err.message, rawValue);
            }
          },
        });
      } catch (error: any) {
        this.logger.warn(`[Kafka Consumer] Could not connect to Kafka broker: ${error.message}. Consumer in standby.`);
        this.isRunning = false;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.consumer && this.isRunning) {
      try {
        await this.consumer.disconnect();
        this.isRunning = false;
        this.logger.log('[Kafka Consumer] Disconnected.');
      } catch (err: any) {
        this.logger.error(`[Kafka Consumer] Error on disconnect: ${err.message}`);
      }
    }
  }

  /**
   * Processes a targeted send notification command
   */
  async processSendNotification(input: KafkaNotificationSendInput, topic = KAFKA_TOPIC_NOTIFICATION_SEND): Promise<any> {
    try {
      this.validateSendInput(input);
      return await this.notificationService.createNotification({
        userId: input.userId,
        leadId: input.leadId,
        notificationType: input.notificationType,
        title: input.title,
        message: input.message,
        priority: input.priority as any,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
        deduplicationKey: input.deduplicationKey,
      });
    } catch (err: any) {
      this.logger.error(`[Kafka Notification Failure]: ${err.message}`);
      await this.publisher.publishToDlq(topic, err.message, input);
      throw err;
    }
  }

  /**
   * Processes a broadcast notification command
   */
  async processBroadcastNotification(input: KafkaNotificationBroadcastInput, topic = KAFKA_TOPIC_NOTIFICATION_BROADCAST): Promise<any> {
    try {
      this.validateBroadcastInput(input);
      return await this.notificationService.broadcastNotification({
        targetRole: input.targetRole,
        notificationType: input.notificationType,
        title: input.title,
        message: input.message,
        priority: input.priority as any,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
      });
    } catch (err: any) {
      this.logger.error(`[Kafka Broadcast Failure]: ${err.message}`);
      await this.publisher.publishToDlq(topic, err.message, input);
      throw err;
    }
  }

  private validateSendInput(input: KafkaNotificationSendInput) {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new BadRequestException('Validation Failed: userId must be a non-empty string.');
    }
    if (!input.notificationType || typeof input.notificationType !== 'string') {
      throw new BadRequestException('Validation Failed: notificationType must be a non-empty string.');
    }
    if (!input.message || typeof input.message !== 'string') {
      throw new BadRequestException('Validation Failed: message must be a non-empty string.');
    }
  }

  private validateBroadcastInput(input: KafkaNotificationBroadcastInput) {
    if (!input.targetRole || typeof input.targetRole !== 'string') {
      throw new BadRequestException('Validation Failed: targetRole must be a non-empty string.');
    }
    if (!input.message || typeof input.message !== 'string') {
      throw new BadRequestException('Validation Failed: message must be a non-empty string.');
    }
  }
}
