import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../repository/notification.repository';
import { PreferenceService } from './preference.service';
import { NotificationKafkaPublisherService } from '../kafka/notification-kafka-publisher.service';
import { CreateNotificationDto, BroadcastNotificationDto } from '../dto/create-notification.dto';
import { NotificationQueryDto } from '../dto/query-notification.dto';
import {
  NotificationRecord,
  PaginatedNotificationsResult,
  NotificationStats,
} from '../interfaces/notification.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly preferenceService: PreferenceService,
    private readonly kafkaPublisher: NotificationKafkaPublisherService,
  ) {}

  /**
   * Create and deliver a single notification to a user
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationRecord | null> {
    // 1. Check deduplication
    if (dto.deduplicationKey) {
      const existing = await this.repository.findByDeduplicationKey(dto.deduplicationKey);
      if (existing) {
        this.logger.warn(`[NotificationEngine] Duplicate notification skipped: ${dto.deduplicationKey}`);
        return existing;
      }
    }

    // 2. Evaluate priority & title
    const priority = this.preferenceService.normalizePriority(dto.notificationType, dto.priority);
    const title = dto.title || this.preferenceService.getDefaultTitle(dto.notificationType);

    // 3. Persist record
    const record = await this.repository.create({
      userId: dto.userId,
      leadId: dto.leadId,
      notificationType: dto.notificationType,
      title,
      message: dto.message,
      priority,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata || {},
      deduplicationKey: dto.deduplicationKey,
    });

    this.logger.log(`[NotificationEngine] Created notification '${record.id}' for user '${record.userId}' (Priority: ${record.priority})`);

    // 4. Broadcast via Kafka Outbox
    try {
      await this.kafkaPublisher.broadcastNotificationDelivered(record);
    } catch (err: any) {
      this.logger.warn(`Kafka broadcast error: ${err.message}`);
    }

    return record;
  }

  /**
   * Broadcast a notification to all users matching a role (e.g. all counselors)
   */
  async broadcastNotification(dto: BroadcastNotificationDto): Promise<NotificationRecord[]> {
    this.logger.log(`[NotificationEngine] Broadcasting '${dto.notificationType}' to role '${dto.targetRole}'`);

    // In a production setup, we query users by role from the database.
    // For demo/standard dispatch, we send to the role group:
    const targetUserIds = [`usr-${dto.targetRole}-01`, `usr-${dto.targetRole}-02`];
    const records: NotificationRecord[] = [];

    for (const userId of targetUserIds) {
      const record = await this.createNotification({
        userId,
        notificationType: dto.notificationType,
        title: dto.title,
        message: dto.message,
        priority: dto.priority as any,
        actionUrl: dto.actionUrl,
        metadata: { ...(dto.metadata || {}), targetRole: dto.targetRole },
      });
      if (record) records.push(record);
    }

    return records;
  }

  /**
   * Query counselor inbox feed
   */
  async getInbox(query: NotificationQueryDto): Promise<PaginatedNotificationsResult> {
    return this.repository.query(query);
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<NotificationRecord> {
    const updated = await this.repository.markAsRead(id);
    if (!updated) throw new NotFoundException(`Notification '${id}' not found.`);
    return updated;
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; updatedCount: number }> {
    const count = await this.repository.markAllAsRead(userId);
    return { success: true, updatedCount: count };
  }

  /**
   * Get notification statistics
   */
  async getStats(userId?: string): Promise<NotificationStats> {
    return this.repository.getStats(userId);
  }

  /**
   * Generate daily operational activity digest
   */
  async getDailyDigest(userId: string): Promise<any> {
    const stats = await this.getStats(userId);
    const unread = await this.getInbox({ userId, isRead: false, limit: 5 });

    return {
      userId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalNotifications: stats.total,
        unreadAlerts: stats.unread,
        criticalAlertsCount: stats.byPriority['critical'] || 0,
      },
      topUnreadAlerts: unread.data,
    };
  }
}
