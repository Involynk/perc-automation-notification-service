import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  NotificationRecord,
  NotificationPriority,
  PaginatedNotificationsResult,
  NotificationStats,
} from '../interfaces/notification.interface';
import { NotificationQueryDto } from '../dto/query-notification.dto';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);
  private readonly store: Map<string, NotificationRecord> = new Map();

  async create(data: Partial<NotificationRecord>): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      id: data.id || `notif_${uuidv4()}`,
      userId: data.userId!,
      leadId: data.leadId || null,
      notificationType: data.notificationType!,
      title: data.title || 'Notification',
      message: data.message || '',
      isRead: false,
      readAt: null,
      actionUrl: data.actionUrl || null,
      priority: data.priority || NotificationPriority.NORMAL,
      metadata: data.metadata || {},
      deduplicationKey: data.deduplicationKey || null,
      createdAt: data.createdAt || new Date(),
    };

    this.store.set(record.id, record);
    return record;
  }

  async findByDeduplicationKey(key: string): Promise<NotificationRecord | null> {
    for (const record of this.store.values()) {
      if (record.deduplicationKey === key) return record;
    }
    return null;
  }

  async findById(id: string): Promise<NotificationRecord | null> {
    return this.store.get(id) || null;
  }

  async markAsRead(id: string): Promise<NotificationRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    record.isRead = true;
    record.readAt = new Date();
    this.store.set(id, record);
    return record;
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const record of this.store.values()) {
      if (record.userId === userId && !record.isRead) {
        record.isRead = true;
        record.readAt = new Date();
        count++;
      }
    }
    return count;
  }

  async query(query: NotificationQueryDto): Promise<PaginatedNotificationsResult> {
    const { userId, isRead, priority, notificationType, search, page = 1, limit = 20 } = query;

    let items = Array.from(this.store.values());

    if (userId) items = items.filter((item) => item.userId === userId);
    if (isRead !== undefined) items = items.filter((item) => item.isRead === isRead);
    if (priority) items = items.filter((item) => item.priority.toLowerCase() === priority.toLowerCase());
    if (notificationType) items = items.filter((item) => item.notificationType.toLowerCase() === notificationType.toLowerCase());

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          item.notificationType.toLowerCase().includes(q),
      );
    }

    // Sort descending by createdAt
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const unreadCount = items.filter((i) => !i.isRead).length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = items.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      total,
      unreadCount,
      page,
      limit,
      totalPages,
    };
  }

  async getStats(userId?: string): Promise<NotificationStats> {
    let items = Array.from(this.store.values());
    if (userId) items = items.filter((i) => i.userId === userId);

    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let unread = 0;

    items.forEach((item) => {
      if (!item.isRead) unread++;
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      byType[item.notificationType] = (byType[item.notificationType] || 0) + 1;
    });

    return {
      total: items.length,
      unread,
      byPriority,
      byType,
    };
  }
}
