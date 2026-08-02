import { Injectable, Logger } from '@nestjs/common';
import { RawNotificationPayload, normalizePriority, normalizeNotificationType } from '../interfaces/notification.interface';

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  /**
   * Validates recipient notification preferences and assigns default priority if missing
   */
  shouldDispatch(payload: RawNotificationPayload): { dispatch: boolean; priority: string; notificationType: string; reason?: string } {
    let rawPriority = payload.priority || 'normal';
    const notificationType = normalizeNotificationType(payload.notificationType);

    // System escalations and missed calls are forced to critical
    if (payload.notificationType === 'ESCALATION_TRIGGERED' || payload.notificationType === 'CALL_MISSED' || notificationType === 'meeting_missed') {
      rawPriority = 'critical';
    }

    const priority = normalizePriority(rawPriority);

    this.logger.log(`Evaluating notification '${payload.notificationType}' -> DB type '${notificationType}' for user ${payload.userId} [Priority: ${priority}]`);

    return {
      dispatch: true,
      priority,
      notificationType,
    };
  }
}
