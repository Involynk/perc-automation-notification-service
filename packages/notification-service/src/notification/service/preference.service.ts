import { Injectable, Logger } from '@nestjs/common';
import { NotificationPriority, RawNotificationPayload } from '../interfaces/notification.interface';

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  private readonly criticalEventTypes = new Set([
    'ESCALATION_TRIGGERED',
    'CALL_MISSED',
    'MEETING_MISSED',
    'SLA_BREACHED',
    'LEAD_LOST_RISK',
  ]);

  /**
   * Evaluates notification dispatch policy and returns normalized parameters
   */
  shouldDispatch(payload: RawNotificationPayload): { dispatch: boolean; priority: string; notificationType: string } {
    const priority = this.normalizePriority(payload.notificationType, payload.priority);
    return {
      dispatch: true,
      priority,
      notificationType: payload.notificationType,
    };
  }

  /**
   * Normalizes incoming priority string to enum constraint and applies auto-escalation rules
   */
  normalizePriority(notificationType: string, incomingPriority?: string): NotificationPriority {
    const upperType = notificationType.toUpperCase();

    // Auto-escalation rule: Critical events are always elevated to CRITICAL
    if (this.criticalEventTypes.has(upperType)) {
      return NotificationPriority.CRITICAL;
    }

    if (!incomingPriority) {
      return NotificationPriority.NORMAL;
    }

    const lower = incomingPriority.toLowerCase();
    switch (lower) {
      case 'low':
        return NotificationPriority.LOW;
      case 'high':
        return NotificationPriority.HIGH;
      case 'critical':
      case 'urgent':
        return NotificationPriority.CRITICAL;
      case 'normal':
      default:
        return NotificationPriority.NORMAL;
    }
  }

  /**
   * Generates default titles for known PERC event types
   */
  getDefaultTitle(notificationType: string): string {
    switch (notificationType.toUpperCase()) {
      case 'LEAD_CREATED':
        return 'New Lead Ingestion';
      case 'LEAD_ASSIGNED':
        return 'New Lead Assigned to You';
      case 'FOLLOWUP_DUE':
        return 'Follow-up Call Overdue';
      case 'CALL_SCHEDULED':
        return 'Counseling Call Scheduled';
      case 'MEETING_MISSED':
        return '⚠️ Counseling Session Missed';
      case 'ESCALATION_TRIGGERED':
        return '🚨 Urgent: Lead SLA Escalation';
      case 'ADMISSION_COMPLETED':
        return '🎉 Admission Completed!';
      case 'PAYMENT_PENDING':
        return 'Payment Pending Reminder';
      default:
        return notificationType.replace(/_/g, ' ');
    }
  }
}
