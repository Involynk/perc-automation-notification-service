import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationRecord, NotificationStats } from '../interfaces/notification.interface';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import * as crypto from 'crypto';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);
  private memoryStore: NotificationRecord[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<NotificationRecord>): Promise<NotificationRecord> {
    const id = data.id || crypto.randomUUID();
    const record: NotificationRecord = {
      id,
      userId: data.userId!,
      leadId: data.leadId || null,
      notificationType: data.notificationType!,
      title: data.title!,
      message: data.message!,
      isRead: data.isRead || false,
      readAt: data.readAt || null,
      actionUrl: data.actionUrl || null,
      priority: data.priority || 'MEDIUM',
      metadata: data.metadata || {},
      createdAt: data.createdAt || new Date().toISOString(),
    };

    try {
      if ((this.prisma as any).notification) {
        const dbRecord = await (this.prisma as any).notification.create({
          data: {
            id,
            userId: record.userId,
            leadId: record.leadId,
            notificationType: record.notificationType,
            title: record.title,
            message: record.message,
            isRead: record.isRead,
            actionUrl: record.actionUrl,
            priority: record.priority,
            metadata: record.metadata,
          },
        });
        return this.mapDbToRecord(dbRecord);
      }
    } catch (error) {
      this.logger.debug(`Prisma write skipped (${error.message}); utilizing in-memory repository fallback.`);
    }

    this.memoryStore.unshift(record);
    return record;
  }

  async findByUserId(userId: string, query: QueryNotificationDto): Promise<{ data: NotificationRecord[]; total: number; page: number; totalPages: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    try {
      if ((this.prisma as any).notification) {
        const where: any = { userId };
        if (query.unreadOnly) where.isRead = false;
        if (query.priority) where.priority = query.priority.toUpperCase();
        if (query.notificationType) where.notificationType = query.notificationType;

        const [items, total] = await Promise.all([
          (this.prisma as any).notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          (this.prisma as any).notification.count({ where }),
        ]);

        return {
          data: items.map(this.mapDbToRecord),
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (error) {}

    let filtered = this.memoryStore.filter((n) => n.userId === userId);
    if (query.unreadOnly) filtered = filtered.filter((n) => !n.isRead);
    if (query.priority) filtered = filtered.filter((n) => n.priority.toUpperCase() === query.priority!.toUpperCase());
    if (query.notificationType) filtered = filtered.filter((n) => n.notificationType === query.notificationType);

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markAsRead(id: string): Promise<NotificationRecord | null> {
    const now = new Date();
    try {
      if ((this.prisma as any).notification) {
        const updated = await (this.prisma as any).notification.update({
          where: { id },
          data: { isRead: true, readAt: now },
        });
        return this.mapDbToRecord(updated);
      }
    } catch (error) {}

    const index = this.memoryStore.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.memoryStore[index].isRead = true;
      this.memoryStore[index].readAt = now.toISOString();
      return this.memoryStore[index];
    }
    return null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const now = new Date();
    try {
      if ((this.prisma as any).notification) {
        const result = await (this.prisma as any).notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: now },
        });
        return result.count;
      }
    } catch (error) {}

    let count = 0;
    this.memoryStore.forEach((n) => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = now.toISOString();
        count++;
      }
    });
    return count;
  }

  async getStats(userId?: string): Promise<NotificationStats> {
    const list = userId ? this.memoryStore.filter((n) => n.userId === userId) : this.memoryStore;
    const totalNotifications = list.length;
    const unreadCount = list.filter((n) => !n.isRead).length;

    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};

    list.forEach((n) => {
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
      byType[n.notificationType] = (byType[n.notificationType] || 0) + 1;
    });

    return { totalNotifications, unreadCount, byPriority, byType };
  }

  private mapDbToRecord(dbRecord: any): NotificationRecord {
    return {
      id: dbRecord.id,
      userId: dbRecord.userId,
      leadId: dbRecord.leadId,
      notificationType: dbRecord.notificationType,
      title: dbRecord.title,
      message: dbRecord.message,
      isRead: dbRecord.isRead,
      readAt: dbRecord.readAt,
      actionUrl: dbRecord.actionUrl,
      priority: dbRecord.priority,
      metadata: typeof dbRecord.metadata === 'string' ? JSON.parse(dbRecord.metadata) : dbRecord.metadata,
      createdAt: dbRecord.createdAt,
    };
  }
}
