import { Module } from '@nestjs/common';
import { TimelineController } from './controller/timeline.controller';
import { TimelineService } from './service/timeline.service';
import { EventConsumerService } from './consumer/event-consumer.service';
import { EventValidatorService } from './validator/event-validator.service';
import { EventTransformerService } from './transformer/event-transformer.service';
import { TimelineRepository } from './repository/timeline.repository';
import { TimelineKafkaPublisherService } from './kafka/timeline-kafka-publisher.service';
import { TimelineKafkaConsumerService } from './kafka/timeline-kafka-consumer.service';

@Module({
  controllers: [TimelineController],
  providers: [
    TimelineService,
    EventConsumerService,
    EventValidatorService,
    EventTransformerService,
    TimelineRepository,
    TimelineKafkaPublisherService,
    TimelineKafkaConsumerService,
  ],
  exports: [
    TimelineService,
    EventConsumerService,
    TimelineRepository,
    TimelineKafkaPublisherService,
    TimelineKafkaConsumerService,
  ],
})
export class TimelineModule {}

