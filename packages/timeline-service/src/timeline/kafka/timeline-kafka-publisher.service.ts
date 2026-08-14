import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaProducerService, KafkaTimelineEventRecordedOutput } from '@perc/shared';
import { TimelineEventRecord } from '../interfaces/timeline-event.interface';

@Injectable()
export class TimelineKafkaPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimelineKafkaPublisherService.name);
  private producer: KafkaProducerService;

  constructor() {
    this.producer = new KafkaProducerService({
      clientId: 'perc-timeline-engine-publisher',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Timeline Engine Kafka Publisher initialized.');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  /**
   * Broadcasts that a timeline event was successfully recorded in PostgreSQL.
   * Consumed by Analytics Engine (Engine 9), Follow-up Engine (Engine 6),
   * Recommendation Engine (Engine 10), and Notification Engine (Engine 8).
   * Topic: perc.timeline.event-recorded
   */
  async broadcastEventRecorded(record: TimelineEventRecord): Promise<void> {
    const outputPayload: KafkaTimelineEventRecordedOutput = {
      eventId: record.id,
      eventType: 'TIMELINE_EVENT_RECORDED',
      timelineId: record.id,
      workflowId: record.workflowId,
      leadId: record.leadId,
      originalEventType: record.eventType,
      sourceEngine: record.sourceEngine,
      actorType: record.actorType,
      actorId: record.actorId,
      title: record.title,
      description: record.description,
      metadata: record.metadata || {},
      deduplicationKey: record.deduplicationKey,
      recordedAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
      occurredAt: record.occurredAt ? record.occurredAt.toISOString() : new Date().toISOString(),
    };

    try {
      const result = await this.producer.publishTimelineRecordedOutput(outputPayload);
      if (result.success) {
        this.logger.log(
          `[Kafka Outbox] Emitted TIMELINE_EVENT_RECORDED to 'perc.timeline.event-recorded' for Lead: ${record.leadId}, Event: ${record.eventType}`,
        );
      } else {
        this.logger.warn(`[Kafka Outbox] Broadcast warning: ${result.error}`);
      }
    } catch (err: any) {
      this.logger.error(`[Kafka Outbox] Failed to broadcast event: ${err.message}`);
    }
  }

  getProducer(): KafkaProducerService {
    return this.producer;
  }
}
