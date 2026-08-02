import axios from 'axios';

export interface SendNotificationOptions {
  userId: string;
  leadId?: string;
  notificationType: string;
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  baseUrl?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class NotificationClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
  }

  /**
   * Dispatches an administrative notification to Engine 8 (Notification Engine)
   */
  async sendNotification(options: SendNotificationOptions): Promise<SendNotificationResponse> {
    const payload = {
      userId: options.userId,
      leadId: options.leadId || null,
      notificationType: options.notificationType,
      title: options.title,
      message: options.message,
      priority: options.priority || 'MEDIUM',
      actionUrl: options.actionUrl || null,
      metadata: options.metadata || {},
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/notifications/send`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown network error';
      return {
        success: false,
        error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
      };
    }
  }

  /**
   * Fetches unread and historical notifications for a specific user ID
   */
  async getUserNotifications(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/notifications/user/${userId}`, {
        params: options,
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Marks a specific notification record as read
   */
  async markAsRead(notificationId: string) {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/v1/notifications/${notificationId}/read`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
