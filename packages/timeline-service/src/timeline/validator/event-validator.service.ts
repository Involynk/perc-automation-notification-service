import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { RawEngineEvent } from '../interfaces/timeline-event.interface';
import { TimelineRepository } from '../repository/timeline.repository';

@Injectable()
export class EventValidatorService {
  private readonly logger = new Logger(EventValidatorService.name);

  constructor(private readonly repository: TimelineRepository) {}

  async validate(event: RawEngineEvent): Promise<void> {
    if (!event.workflowId || !this.isValidUUID(event.workflowId)) {
      throw new BadRequestException('Validation Failed: workflowId must be a valid non-empty UUID.');
    }

    if (!event.leadId || !this.isValidUUID(event.leadId)) {
      throw new BadRequestException('Validation Failed: leadId must be a valid non-empty UUID.');
    }

    if (!event.eventType || typeof event.eventType !== 'string' || event.eventType.trim() === '') {
      throw new BadRequestException('Validation Failed: eventType must be a non-empty string.');
    }

    if (!event.sourceEngine || typeof event.sourceEngine !== 'string' || event.sourceEngine.trim() === '') {
      throw new BadRequestException('Validation Failed: sourceEngine must be a non-empty string.');
    }

    if (event.occurredAt) {
      const date = new Date(event.occurredAt);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Validation Failed: occurredAt must be a valid ISO timestamp.');
      }
    }

    if (event.deduplicationKey) {
      const existing = await this.repository.findByDeduplicationKey(event.deduplicationKey);
      if (existing) {
        throw new ConflictException(`Duplicate Event Rejected: Deduplication key '${event.deduplicationKey}' exists.`);
      }
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
  }
}
