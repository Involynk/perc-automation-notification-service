import { Injectable, Logger } from '@nestjs/common';
import { RawEngineEvent, TimelineEventRecord, ActorType } from '../interfaces/timeline-event.interface';

@Injectable()
export class EventTransformerService {
  private readonly logger = new Logger(EventTransformerService.name);

  transform(raw: RawEngineEvent): Partial<TimelineEventRecord> {
    const eventType = raw.eventType.toUpperCase();
    const sourceEngine = raw.sourceEngine.toUpperCase();
    const metadata = raw.metadata || {};

    let title = raw.title;
    let description = raw.description;
    let actorType = raw.actorType || ActorType.SYSTEM;

    if (!title || !description) {
      const defaults = this.getDefaultTitleAndDescription(eventType, sourceEngine, metadata);
      title = title || defaults.title;
      description = description || defaults.description;
      if (!raw.actorType) actorType = defaults.actorType;
    }

    return {
      workflowId: raw.workflowId,
      leadId: raw.leadId,
      eventType,
      sourceEngine,
      actorType,
      actorId: raw.actorId || null,
      title,
      description,
      metadata,
      deduplicationKey: raw.deduplicationKey || null,
      occurredAt: raw.occurredAt ? new Date(raw.occurredAt) : new Date(),
    };
  }

  private getDefaultTitleAndDescription(
    eventType: string,
    sourceEngine: string,
    metadata: Record<string, any>,
  ): { title: string; description: string; actorType: string } {
    switch (eventType) {
      case 'LEAD_CREATED':
        return { title: 'Lead Created', description: metadata.source ? `New lead via ${metadata.source}` : 'Website enquiry captured', actorType: ActorType.SYSTEM };
      case 'LEAD_UPDATED':
        return { title: 'Lead Updated', description: 'Lead contact details updated', actorType: ActorType.SYSTEM };
      case 'MESSAGE_SENT':
        return { title: 'Message Sent', description: metadata.channel ? `${metadata.channel} message sent` : 'WhatsApp message sent', actorType: ActorType.BOT };
      case 'BROCHURE_SHARED':
        return { title: 'Brochure Shared', description: 'Course brochure sent to prospect', actorType: ActorType.SYSTEM };
      case 'FEE_STRUCTURE_SHARED':
        return { title: 'Fee Structure Shared', description: 'Fee details delivered', actorType: ActorType.SYSTEM };
      case 'WORKFLOW_STARTED':
        return { title: 'Workflow Started', description: 'Automation workflow initialized', actorType: ActorType.SYSTEM };
      case 'REMINDER_SCHEDULED':
        return { title: 'Reminder Scheduled', description: 'Follow-up reminder set', actorType: ActorType.SYSTEM };
      case 'MEETING_SCHEDULED':
        return { title: 'Meeting Scheduled', description: '1-on-1 counseling session booked', actorType: ActorType.ADMIN };
      case 'MEETING_COMPLETED':
        return { title: 'Meeting Completed', description: 'Counseling session completed', actorType: ActorType.ADMIN };
      case 'INTERNAL_NOTE_ADDED':
        return { title: 'Internal Note Added', description: 'Internal note recorded', actorType: ActorType.ADMIN };
      default:
        return { title: eventType.replace(/_/g, ' '), description: `${sourceEngine} published ${eventType}`, actorType: ActorType.SYSTEM };
    }
  }
}
