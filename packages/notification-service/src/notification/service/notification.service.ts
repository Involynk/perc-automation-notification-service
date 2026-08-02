import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationConsumerService } from '../consumer/notification-consumer.service';
import { NotificationRepository } from '../repository/notification.repository';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { NotificationRecord, NotificationStats, NotificationPriority, NotificationType } from '../interfaces/notification.interface';

const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEMO_LEAD_ID = 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38';

const DEMO_NOTIFICATIONS: SendNotificationDto[] = [
  {
    userId: DEMO_USER_ID,
    leadId: DEMO_LEAD_ID,
    notificationType: NotificationType.CALL_MISSED,
    title: 'Urgent: Missed Counseling Call Alert',
    message: 'Senior Advisor missed 1-on-1 counseling demo with prospect Aarav Sharma.',
    priority: NotificationPriority.CRITICAL,
    actionUrl: '/leads/detail/a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38',
    metadata: { missedDurationSeconds: 120, channel: 'phone' },
  },
  {
    userId: DEMO_USER_ID,
    leadId: DEMO_LEAD_ID,
    notificationType: NotificationType.LEAD_CREATED,
    title: 'New High Priority Lead Ingested',
    message: 'New inquiry for B.Tech CS captured from Google Search Ads.',
    priority: NotificationPriority.HIGH,
    actionUrl: '/leads/detail/a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38',
    metadata: { campaign: 'Google_CS_2026', source: 'website_form' },
  },
  {
    userId: DEMO_USER_ID,
    leadId: DEMO_LEAD_ID,
    notificationType: NotificationType.REMINDER_DUE,
    title: 'Follow-up Call Scheduled Today',
    message: 'Scheduled follow-up call with student parent regarding merit scholarship.',
    priority: NotificationPriority.NORMAL,
    actionUrl: '/calendar',
    metadata: { scheduledTime: new Date().toISOString() },
  },
  {
    userId: DEMO_USER_ID,
    leadId: DEMO_LEAD_ID,
    notificationType: NotificationType.ADMISSION_COMPLETED,
    title: 'Student Enrollment Completed 🎉',
    message: 'Student Aarav Sharma completed fee payment and enrollment papers.',
    priority: NotificationPriority.HIGH,
    actionUrl: '/admissions',
    metadata: { batchId: 'batch_cs_2026_a' },
  },
];

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly consumer: NotificationConsumerService,
    private readonly repository: NotificationRepository,
  ) {}

  async onModuleInit() {
    try {
      const stats = await this.repository.getStats(DEMO_USER_ID);
      if (stats.totalNotifications === 0) {
        this.logger.log('Seeding initial demo notification inbox records...');
        for (const notif of DEMO_NOTIFICATIONS) {
          await this.consumer.consumeNotification(notif);
        }
      }
    } catch (error) {
      this.logger.warn(`Demo notification seeding skipped: ${error.message}`);
    }
  }

  async sendNotification(dto: SendNotificationDto): Promise<NotificationRecord> {
    return this.consumer.consumeNotification(dto);
  }

  async getUserNotifications(userId: string, query: QueryNotificationDto) {
    return this.repository.findByUserId(userId, query);
  }

  async markAsRead(id: string): Promise<NotificationRecord> {
    const updated = await this.repository.markAsRead(id);
    if (!updated) throw new NotFoundException(`Notification '${id}' not found.`);
    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    const count = await this.repository.markAllAsRead(userId);
    return { success: true, count };
  }

  async generateDailyDigest(userId: string): Promise<NotificationRecord> {
    return this.sendNotification({
      userId,
      notificationType: NotificationType.DAILY_SUMMARY,
      title: 'Daily Admission Operations Summary',
      message: 'Summary report: 4 active inquiries, 2 pending calls, 1 completed enrollment today.',
      priority: NotificationPriority.LOW,
      actionUrl: '/analytics/daily-summary',
      metadata: { generatedAt: new Date().toISOString() },
    });
  }

  async getStats(userId?: string): Promise<NotificationStats> {
    return this.repository.getStats(userId);
  }
}
