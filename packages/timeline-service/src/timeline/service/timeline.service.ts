import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { EventConsumerService } from '../consumer/event-consumer.service';
import { TimelineRepository } from '../repository/timeline.repository';
import { PublishEventDto } from '../dto/publish-event.dto';
import { TimelineQueryDto } from '../dto/timeline-query.dto';
import { CreateNoteDto } from '../dto/create-note.dto';
import {
  TimelineEventRecord,
  PaginatedTimelineResult,
  EngineStats,
  SourceEngine,
  ActorType,
  KnownEventType,
} from '../interfaces/timeline-event.interface';
import { DEMO_EVENTS } from '../../seed';

@Injectable()
export class TimelineService implements OnModuleInit {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private readonly consumer: EventConsumerService,
    private readonly repository: TimelineRepository,
  ) {}

  async onModuleInit() {
    try {
      const stats = await this.repository.getStats();
      if (stats.totalEvents === 0) {
        this.logger.log('Seeding initial workflow timeline demo events...');
        for (const event of DEMO_EVENTS) {
          await this.consumer.consumeEvent(event);
        }
      }
    } catch (error) {
      this.logger.warn(`Demo event seeding skipped: ${error.message}`);
    }
  }

  async publishEvent(dto: PublishEventDto): Promise<TimelineEventRecord> {
    return this.consumer.consumeEvent(dto);
  }

  async getWorkflowTimeline(workflowId: string, query: TimelineQueryDto): Promise<PaginatedTimelineResult> {
    return this.repository.findByWorkflowId(workflowId, query);
  }

  async getLeadTimeline(leadId: string, query: TimelineQueryDto): Promise<PaginatedTimelineResult> {
    return this.repository.findByLeadId(leadId, query);
  }

  async searchTimeline(query: TimelineQueryDto): Promise<PaginatedTimelineResult> {
    return this.repository.search(query);
  }

  async getEventDetails(eventId: string): Promise<TimelineEventRecord> {
    const event = await this.repository.findById(eventId);
    if (!event) throw new NotFoundException(`Timeline event '${eventId}' not found.`);
    return event;
  }

  async addInternalNote(workflowId: string, dto: CreateNoteDto): Promise<TimelineEventRecord> {
    return this.publishEvent({
      workflowId,
      leadId: dto.leadId,
      eventType: KnownEventType.INTERNAL_NOTE_ADDED,
      sourceEngine: SourceEngine.ADMIN,
      actorType: ActorType.ADMIN,
      actorId: dto.actorId,
      title: dto.title,
      description: dto.description,
      metadata: dto.metadata || { isInternal: true },
    });
  }

  async getStats(): Promise<EngineStats> {
    return this.repository.getStats();
  }
}
