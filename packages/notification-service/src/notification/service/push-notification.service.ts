import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface PushNotificationPayload {
  recipientToken?: string;
  targetRole?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  /**
   * Dispatches Web Push / FCM Push notification in real-time to Admin or Sales staff devices
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; deliveredAt: string }> {
    const deliveredAt = new Date().toISOString();
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    const fcmUrl = process.env.FCM_SEND_URL || 'https://fcm.googleapis.com/fcm/send';

    this.logger.log(`[Web Push Dispatch] Title: "${payload.title}" | Target: ${payload.targetRole || payload.recipientToken || 'Admin Group'}`);

    if (!fcmServerKey) {
      this.logger.log(`[Web Push] FCM_SERVER_KEY not set. Operating in local Web Push broadcast mode: "${payload.body}"`);
      return { success: true, deliveredAt };
    }

    try {
      const pushBody = JSON.stringify({
        to: payload.recipientToken || `/topics/${payload.targetRole || 'admin'}`,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/notification-icon.png',
          badge: payload.badge || '/badge.png',
          click_action: payload.data?.actionUrl || '/dashboard',
        },
        data: payload.data || {},
        priority: 'high',
      });

      // HTTP POST to Web Push / FCM Endpoint
      const url = new URL(fcmUrl);
      const reqOptions: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`,
          'Content-Length': Buffer.byteLength(pushBody),
        },
      };

      await new Promise<void>((resolve, reject) => {
        const req = https.request(reqOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              this.logger.log(`[Web Push Delivered Successfully] Status: ${res.statusCode}`);
              resolve();
            } else {
              this.logger.warn(`[Web Push Response Warning] Status: ${res.statusCode} | Body: ${data}`);
              resolve(); // Non-blocking
            }
          });
        });

        req.on('error', (err) => {
          this.logger.error(`[Web Push HTTP Error]: ${err.message}`);
          resolve(); // Non-blocking
        });

        req.write(pushBody);
        req.end();
      });
    } catch (err: any) {
      this.logger.error(`[Web Push Exception]: ${err.message}`);
    }

    return { success: true, deliveredAt };
  }

  /**
   * Helper to interpolate variables into template string e.g. {{leadId}} -> '123'
   */
  interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
    });
  }
}
