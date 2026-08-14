import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RawEngineEvent, TimelineEventRecord } from '../interfaces/timeline-event.interface';
import { EventValidatorService } from '../validator/event-validator.service';
import { EventTransformerService } from '../transformer/event-transformer.service';
import { TimelineRepository } from '../repository/timeline.repository';
import { TimelineKafkaPublisherService } from '../kafka/timeline-kafka-publisher.service';

@Injectable()
export class EventConsumerService {
  private readonly logger = new Logger(EventConsumerService.name);

  constructor(
    private readonly validator: EventValidatorService,
    private readonly transformer: EventTransformerService,
    private readonly repository: TimelineRepository,
    private readonly publisher: TimelineKafkaPublisherService,
  ) {}

  async consumeEvent(rawEvent: RawEngineEvent): Promise<TimelineEventRecord> {
    this.logger.log(`Ingesting event '${rawEvent.eventType}' from engine '${rawEvent.sourceEngine}'`);
    await this.validator.validate(rawEvent);
    const transformed = this.transformer.transform(rawEvent);
    const record = await this.repository.create(transformed);
    this.logger.log(`Saved timeline event ID: ${record.id}`);

    // Broadcast to Kafka output topic perc.timeline.event-recorded
    try {
      await this.publisher.broadcastEventRecorded(record);
    } catch (err: any) {
      this.logger.warn(`Kafka event-recorded broadcast deferred: ${err.message}`);
    }

    return record;
  }

  @OnEvent('orchestrator.event.published')
  async handleOrchestratorEvent(eventPayload: RawEngineEvent) {
    try {
      await this.consumeEvent(eventPayload);
    } catch (error) {
      this.logger.error(`Event bus ingestion failed: ${error.message}`);
    }
  }
}

