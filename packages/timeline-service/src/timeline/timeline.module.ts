import { Module } from '@nestjs/common';
import { TimelineController } from './controller/timeline.controller';
import { TimelineService } from './service/timeline.service';
import { EventConsumerService } from './consumer/event-consumer.service';
import { EventValidatorService } from './validator/event-validator.service';
import { EventTransformerService } from './transformer/event-transformer.service';
import { TimelineRepository } from './repository/timeline.repository';

@Module({
  controllers: [TimelineController],
  providers: [
    TimelineService,
    EventConsumerService,
    EventValidatorService,
    EventTransformerService,
    TimelineRepository,
  ],
  exports: [TimelineService, EventConsumerService, TimelineRepository],
})
export class TimelineModule {}
