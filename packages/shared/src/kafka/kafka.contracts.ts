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
