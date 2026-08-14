export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum KnownNotificationType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  FOLLOWUP_DUE = 'FOLLOWUP_DUE',
  CALL_SCHEDULED = 'CALL_SCHEDULED',
  MEETING_MISSED = 'MEETING_MISSED',
  ADMISSION_COMPLETED = 'ADMISSION_COMPLETED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  LEAD_LOST = 'LEAD_LOST',
  LEAD_RECOVERED = 'LEAD_RECOVERED',
  ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export interface NotificationRecord {
  id: string;
  userId: string;
  leadId?: string | null;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  actionUrl?: string | null;
  priority: NotificationPriority | string;
  metadata: Record<string, any>;
  deduplicationKey?: string | null;
  createdAt: Date;
}

export interface PaginatedNotificationsResult {
  data: NotificationRecord[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}
