export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationType {
  LEAD_CREATED = 'new_lead',
  NEW_LEAD = 'new_lead',
  LEAD_ASSIGNED = 'lead_assigned',
  REMINDER_DUE = 'followup_due',
  FOLLOWUP_DUE = 'followup_due',
  CALL_SCHEDULED = 'call_scheduled',
  MEETING_SCHEDULED = 'meeting_scheduled',
  CALL_MISSED = 'meeting_missed',
  MEETING_MISSED = 'meeting_missed',
  ADMISSION_COMPLETED = 'admission_completed',
  PAYMENT_PENDING = 'payment_pending',
  LEAD_LOST = 'lead_lost',
  LEAD_RECOVERED = 'lead_recovered',
  ESCALATION = 'escalation',
  ESCALATION_TRIGGERED = 'escalation',
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  CRITICAL_ALERT = 'critical_alert',
}

/**
 * Standardizes any incoming notification type string to match Supabase DB check constraint
 */
export function normalizeNotificationType(type: string): string {
  const map: Record<string, string> = {
    LEAD_CREATED: 'new_lead',
    NEW_LEAD: 'new_lead',
    LEAD_ASSIGNED: 'lead_assigned',
    REMINDER_DUE: 'followup_due',
    FOLLOWUP_DUE: 'followup_due',
    CALL_SCHEDULED: 'call_scheduled',
    MEETING_SCHEDULED: 'meeting_scheduled',
    CALL_MISSED: 'meeting_missed',
    MEETING_MISSED: 'meeting_missed',
    ADMISSION_COMPLETED: 'admission_completed',
    PAYMENT_PENDING: 'payment_pending',
    LEAD_LOST: 'lead_lost',
    LEAD_RECOVERED: 'lead_recovered',
    ESCALATION: 'escalation',
    ESCALATION_TRIGGERED: 'escalation',
    DAILY_SUMMARY: 'daily_summary',
    WEEKLY_SUMMARY: 'weekly_summary',
    CRITICAL_ALERT: 'critical_alert',
    BROCHURE_SHARED: 'new_lead',
    FOLLOWUP_OVERDUE: 'followup_due',
    SYSTEM_ALERT: 'critical_alert',
  };

  const normalized = type ? type.toUpperCase() : '';
  return map[normalized] || map[type] || 'new_lead';
}

/**
 * Standardizes priority string to match Supabase DB check constraint ('low', 'normal', 'high', 'critical')
 */
export function normalizePriority(priority: string): string {
  const p = (priority || 'normal').toLowerCase();
  if (['low', 'normal', 'high', 'critical'].includes(p)) return p;
  if (p === 'medium') return 'normal';
  return 'normal';
}

export interface RawNotificationPayload {
  userId: string;
  leadId?: string;
  notificationType: string;
  title: string;
  message: string;
  priority?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  leadId?: string | null;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | string | null;
  actionUrl?: string | null;
  priority: string;
  metadata: Record<string, any>;
  createdAt: Date | string;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}
