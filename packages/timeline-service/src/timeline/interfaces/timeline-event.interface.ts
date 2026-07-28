export enum SourceEngine {
  LEAD_CAPTURE = 'LEAD_CAPTURE',
  RESPONSE = 'RESPONSE',
  WORKFLOW = 'WORKFLOW',
  SCHEDULER = 'SCHEDULER',
  FOLLOW_UP = 'FOLLOW_UP',
  MEETING = 'MEETING',
  NOTIFICATION = 'NOTIFICATION',
  ADMIN = 'ADMIN',
}

export enum ActorType {
  SYSTEM = 'System',
  USER = 'User',
  ADMIN = 'Admin',
  BOT = 'Bot',
}

export enum KnownEventType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_SOURCE_IDENTIFIED = 'LEAD_SOURCE_IDENTIFIED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  BROCHURE_SHARED = 'BROCHURE_SHARED',
  FEE_STRUCTURE_SHARED = 'FEE_STRUCTURE_SHARED',
  COURSE_DETAILS_SHARED = 'COURSE_DETAILS_SHARED',
  WORKFLOW_STARTED = 'WORKFLOW_STARTED',
  WORKFLOW_PAUSED = 'WORKFLOW_PAUSED',
  WORKFLOW_RESUMED = 'WORKFLOW_RESUMED',
  WORKFLOW_CLOSED = 'WORKFLOW_CLOSED',
  STATE_CHANGED = 'STATE_CHANGED',
  REMINDER_SCHEDULED = 'REMINDER_SCHEDULED',
  REMINDER_CANCELLED = 'REMINDER_CANCELLED',
  REMINDER_EXECUTED = 'REMINDER_EXECUTED',
  FOLLOWUP_SENT = 'FOLLOWUP_SENT',
  RECOVERY_INITIATED = 'RECOVERY_INITIATED',
  CALL_COMPLETED = 'CALL_COMPLETED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_UPDATED = 'MEETING_UPDATED',
  MEETING_COMPLETED = 'MEETING_COMPLETED',
  INTERNAL_NOTE_ADDED = 'INTERNAL_NOTE_ADDED',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
}

export interface RawEngineEvent {
  workflowId: string;
  leadId: string;
  eventType: string;
  sourceEngine: SourceEngine | string;
  actorType?: ActorType | string;
  actorId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  occurredAt?: Date | string;
}

export interface TimelineEventRecord {
  id: string;
  workflowId: string;
  leadId: string;
  eventType: string;
  sourceEngine: string;
  actorType: string;
  actorId?: string | null;
  title: string;
  description: string;
  metadata: Record<string, any>;
  deduplicationKey?: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface PaginatedTimelineResult {
  data: TimelineEventRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EngineStats {
  totalEvents: number;
  eventsByEngine: Record<string, number>;
  eventsByType: Record<string, number>;
  activeWorkflows: number;
}
