import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import {
  KAFKA_TOPIC_LEAD_CAPTURED,
  KAFKA_TOPIC_MEETING_BOOKED,
  KAFKA_TOPIC_SCHEDULER_TRIGGERED,
  KAFKA_GROUP_NOTIFICATION_ENGINE,
} from '@perc/shared';
import { NotificationService } from '../service/notification.service';
import { PushNotificationService } from '../service/push-notification.service';
import { NotificationKafkaPublisherService } from './notification-kafka-publisher.service';

@Injectable()
export class NotificationKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationKafkaConsumerService.name);
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private isRunning = false;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushNotificationService,
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
          topics: [
            KAFKA_TOPIC_LEAD_CAPTURED,        // perc.lead-events (isNewLead === true)
            KAFKA_TOPIC_MEETING_BOOKED,       // perc.meeting-events (meeting.booked)
            KAFKA_TOPIC_SCHEDULER_TRIGGERED,  // perc.scheduler.timer-triggered (targetService === 'notification-service')
          ],
          fromBeginning: false,
        });

        this.isRunning = true;
        this.logger.log(`[Kafka Consumer] Subscribed to [${KAFKA_TOPIC_LEAD_CAPTURED}, ${KAFKA_TOPIC_MEETING_BOOKED}, ${KAFKA_TOPIC_SCHEDULER_TRIGGERED}]`);

        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            const rawValue = message.value?.toString();
            const key = message.key?.toString();
            this.logger.log(`[Kafka Inbound] Topic: ${topic} | Partition: ${partition} | Key: ${key}`);

            if (!rawValue) return;

            try {
              const payload = JSON.parse(rawValue);
              if (topic === KAFKA_TOPIC_LEAD_CAPTURED) {
                await this.processLeadCaptured(payload);
              } else if (topic === KAFKA_TOPIC_MEETING_BOOKED) {
                await this.processMeetingBooked(payload);
              } else if (topic === KAFKA_TOPIC_SCHEDULER_TRIGGERED) {
                await this.processTimerTriggered(payload);
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
   * 1. Subscribed to lead-capture-service (perc.lead-events)
   * Dispatches Web Push alert to Sales / Admin team on new lead arrival
   */
  private async processLeadCaptured(payload: any): Promise<void> {
    if (!payload.isNewLead) return; // Only alert on new lead capture

    const targetRole = process.env.SALES_TARGET_ROLE || 'sales';
    const titleTemplate = process.env.TEMPLATE_NEW_LEAD_TITLE || '⚡ New Lead Alert';
    const bodyTemplate = process.env.TEMPLATE_NEW_LEAD_BODY || 'New lead captured via {{channel}} (Lead ID: {{leadId}})';

    const title = this.pushService.interpolateTemplate(titleTemplate, payload);
    const body = this.pushService.interpolateTemplate(bodyTemplate, payload);

    this.logger.log(`[Lead Captured] Dispatching Web Push alert to role '${targetRole}' for lead: ${payload.leadId}`);

    // Real-time Web Push notification to Sales / Admin staff devices
    await this.pushService.sendPushNotification({
      targetRole,
      title,
      body,
      data: { leadId: payload.leadId, channel: payload.channel, actionUrl: `/leads/${payload.leadId}` },
    });

    await this.notificationService.broadcastNotification({
      targetRole,
      notificationType: 'NEW_LEAD_ALERT',
      title,
      message: body,
      priority: 'high' as any,
      metadata: { leadId: payload.leadId, channel: payload.channel },
    });
  }

  /**
   * 2. Subscribed to meeting-service (perc.meeting-events)
   * Dispatches Web Push alert to Admin host and Admin group when a meeting is booked
   */
  private async processMeetingBooked(payload: any): Promise<void> {
    const { meetingId, leadId, meetingLink, scheduledAt, durationMinutes, organizerId } = payload;
    const targetRole = process.env.ADMIN_TARGET_ROLE || 'admin';

    const titleTemplate = process.env.TEMPLATE_MEETING_BOOKED_TITLE || '📅 Meeting Booked';
    const bodyTemplate = process.env.TEMPLATE_MEETING_BOOKED_BODY || 'Meeting scheduled for {{scheduledAt}} ({{durationMinutes}} min). Join: {{meetingLink}}';

    const title = this.pushService.interpolateTemplate(titleTemplate, payload);
    const body = this.pushService.interpolateTemplate(bodyTemplate, payload);

    this.logger.log(`[Meeting Booked] Dispatching Web Push notification for meeting: ${meetingId}`);

    // Real-time Web Push dispatch to Admin / Host device
    await this.pushService.sendPushNotification({
      targetRole,
      title,
      body,
      data: { meetingId, leadId, meetingLink, scheduledAt, actionUrl: meetingLink },
    });

    if (organizerId) {
      await this.notificationService.createNotification({
        userId: organizerId,
        leadId,
        notificationType: 'MEETING_BOOKED',
        title,
        message: body,
        priority: 'high' as any,
        metadata: { meetingId, meetingLink, scheduledAt, durationMinutes },
      });
    } else {
      await this.notificationService.broadcastNotification({
        targetRole,
        notificationType: 'MEETING_BOOKED',
        title,
        message: body,
        priority: 'high' as any,
        metadata: { meetingId, leadId, meetingLink, scheduledAt },
      });
    }
  }

  /**
   * 3. Subscribed to scheduler-service (perc.scheduler.timer-triggered)
   * Dispatches real-time Web Push pre-meeting reminder when timer expires
   */
  private async processTimerTriggered(payload: any): Promise<void> {
    if (payload.targetService !== 'notification-service') return; // Strict service targeting guard

    const targetRole = process.env.ADMIN_TARGET_ROLE || 'admin';
    const titleTemplate = process.env.TEMPLATE_PRE_MEETING_REMINDER_TITLE || '⏰ Pre-Meeting Reminder';
    const bodyTemplate = process.env.TEMPLATE_PRE_MEETING_REMINDER_BODY || 'Upcoming meeting at {{scheduledAt}}. Join URL: {{meetingLink}}';

    const opaque = payload.opaquePayload || {};
    const title = this.pushService.interpolateTemplate(titleTemplate, opaque);
    const body = this.pushService.interpolateTemplate(bodyTemplate, opaque);

    this.logger.log(`[Timer Triggered] Executing pre-meeting Web Push reminder for lead: ${payload.correlationId}`);

    // Immediate Web Push notification dispatch
    await this.pushService.sendPushNotification({
      targetRole,
      title,
      body,
      data: { leadId: payload.correlationId, actionUrl: opaque.meetingLink || '/meetings' },
    });

    await this.notificationService.broadcastNotification({
      targetRole,
      notificationType: 'PRE_MEETING_REMINDER',
      title,
      message: body,
      priority: 'high' as any,
      metadata: opaque,
    });
  }
}
