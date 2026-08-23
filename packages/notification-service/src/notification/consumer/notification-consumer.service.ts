import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RawNotificationPayload, NotificationRecord } from '../interfaces/notification.interface';
import { PreferenceService } from '../service/preference.service';
import { NotificationRepository } from '../repository/notification.repository';

@Injectable()
export class NotificationConsumerService {
  private readonly logger = new Logger(NotificationConsumerService.name);

  constructor(
    private readonly preferenceService: PreferenceService,
    private readonly repository: NotificationRepository,
  ) {}

  async consumeNotification(payload: RawNotificationPayload): Promise<NotificationRecord> {
    const evalResult = this.preferenceService.shouldDispatch(payload);
    this.logger.log(`Ingesting notification '${payload.notificationType}' for target user ${payload.userId}`);

    const record = await this.repository.create({
      userId: payload.userId,
      leadId: payload.leadId || null,
      notificationType: evalResult.notificationType,
      title: payload.title,
      message: payload.message,
      priority: evalResult.priority,
      actionUrl: payload.actionUrl || null,
      metadata: payload.metadata || {},
    });

    this.logger.log(`Notification ID ${record.id} saved & dispatched [Type: ${record.notificationType} | Priority: ${record.priority}]`);
    return record;
  }

  @OnEvent('notification.send')
  async handleNotificationSendEvent(payload: RawNotificationPayload) {
    try {
      await this.consumeNotification(payload);
    } catch (error) {
      this.logger.error(`Notification event dispatch failed: ${error.message}`);
    }
  }
}
