/**
 * PERC Kafka Event Contracts for Timeline Engine (Engine 5)
 */

import { SourceEngine, ActorType, KnownEventType } from '../enums';

/**
 * Inbound command message to trigger Timeline Engine ingestion.
 * Sent by all producer engines (Lead Capture, Response, Workflow, Scheduler, Follow-up, Meeting, Notifications)
 * Topic: perc.timeline.events
 */
export interface KafkaTimelineEventInput {
  eventId: string;
  workflowId: string;
  leadId: string;
  eventType: string | KnownEventType;
  sourceEngine: string | SourceEngine;
  actorType?: string | ActorType;
  actorId?: string | null;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  occurredAt?: string;
}

/**
 * Inbound command message for counselor / admin manual notes.
 * Topic: perc.timeline.append-note-requested
 */
export interface KafkaAppendNoteInput {
  eventId: string;
  workflowId: string;
  leadId: string;
  title?: string;
  note: string;
  actorId: string;
  metadata?: Record<string, any>;
  occurredAt?: string;
}

/**
 * Outbound broadcast event emitted by Timeline Engine once an event is successfully persisted.
 * Consumed by Analytics Engine, Follow-up Engine, Recommendation Engine, Notification Engine.
 * Topic: perc.timeline.event-recorded
 */
export interface KafkaTimelineEventRecordedOutput {
  eventId: string;
  eventType: 'TIMELINE_EVENT_RECORDED';
  timelineId: string;
  workflowId: string;
  leadId: string;
  originalEventType: string;
  sourceEngine: string;
  actorType: string;
  actorId?: string | null;
  title: string;
  description: string;
  metadata: Record<string, any>;
  deduplicationKey?: string | null;
  recordedAt: string;
  occurredAt: string;
}

/**
 * Dead Letter Queue (DLQ) message wrapper for invalid / malformed messages.
 * Topic: perc.timeline.events.dlq
 */
export interface KafkaTimelineDlqMessage {
  originalTopic: string;
  errorReason: string;
  rawPayload: any;
  receivedAt: string;
  failedAt: string;
}

/**
 * ============================================================================
 * NOTIFICATION ENGINE (ENGINE 8) KAFKA CONTRACTS
 * ============================================================================
 */

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Inbound command message to trigger targeted Counselor / User notification.
 * Topic: perc.notification.send-requested
 */
export interface KafkaNotificationSendInput {
  eventId: string;
  userId: string;
  leadId?: string;
  notificationType: string;
  priority?: NotificationPriority | string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  occurredAt?: string;
}

/**
 * Inbound command message to broadcast notification across an entire role (e.g., all counselors, all admins).
 * Topic: perc.notification.broadcast-requested
 */
export interface KafkaNotificationBroadcastInput {
  eventId: string;
  targetRole: string; // e.g. 'counselor', 'admin'
  notificationType: string;
  priority?: NotificationPriority | string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  occurredAt?: string;
}

/**
 * Outbound broadcast event emitted by Notification Engine upon successful delivery & persistence.
 * Consumed by Timeline Engine (to log in history), Analytics Engine (to compute alert SLAs), and Frontend WebSockets.
 * Topic: perc.notification.notification-delivered
 */
export interface KafkaNotificationDeliveredOutput {
  eventId: string;
  eventType: 'NOTIFICATION_DELIVERED';
  notificationId: string;
  userId: string;
  leadId?: string | null;
  notificationType: string;
  priority: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  metadata: Record<string, any>;
  deliveredAt: string;
  occurredAt: string;
}

