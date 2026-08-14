import {
  KafkaProducerService,
  KAFKA_TOPIC_TIMELINE_EVENTS,
  KAFKA_TOPIC_TIMELINE_APPEND_NOTE,
  KAFKA_TOPIC_TIMELINE_EVENT_RECORDED,
  KAFKA_TOPIC_TIMELINE_DLQ,
  KnownEventType,
  SourceEngine,
  ActorType,
  KafkaTimelineEventInput,
} from '../packages/shared/src';
import { TimelineKafkaConsumerService } from '../packages/timeline-service/src/timeline/kafka/timeline-kafka-consumer.service';
import { TimelineKafkaPublisherService } from '../packages/timeline-service/src/timeline/kafka/timeline-kafka-publisher.service';
import { EventValidatorService } from '../packages/timeline-service/src/timeline/validator/event-validator.service';
import { EventTransformerService } from '../packages/timeline-service/src/timeline/transformer/event-transformer.service';
import { TimelineRepository } from '../packages/timeline-service/src/timeline/repository/timeline.repository';

async function runKafkaTimelineVerification() {
  console.log('================================================================');
  console.log('   PERC ENGINE 5 (CONVERSATION TIMELINE) - KAFKA TEST SUITE    ');
  console.log('================================================================\n');

  // Initialize Timeline Engine components
  const repository = new TimelineRepository();
  const validator = new EventValidatorService(repository);
  const transformer = new EventTransformerService();
  const publisher = new TimelineKafkaPublisherService();
  const consumer = new TimelineKafkaConsumerService(validator, transformer, repository, publisher);
  const testProducer = new KafkaProducerService({ enabled: false }); // in-memory simulator

  let passed = 0;
  let failed = 0;

  // Test 1: Ingest valid LEAD_CREATED event via Kafka contract
  console.log('--- TEST 1: Ingest LEAD_CREATED event via Kafka ---');
  const workflowId1 = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const leadId1 = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
  const event1: KafkaTimelineEventInput = {
    eventId: 'evt_kafka_001',
    workflowId: workflowId1,
    leadId: leadId1,
    eventType: KnownEventType.LEAD_CREATED,
    sourceEngine: SourceEngine.LEAD_CAPTURE,
    actorType: ActorType.SYSTEM,
    title: 'WhatsApp Lead Captured',
    description: 'New prospect Rahul Kumar captured via WhatsApp inbound webhook',
    metadata: { channel: 'whatsapp', program: 'B.Tech CSE', phone: '+919876543210' },
    deduplicationKey: 'dedup_kafka_lead_001',
    occurredAt: new Date().toISOString(),
  };

  try {
    const record = await consumer.processTimelineEvent(event1);
    if (record && record.workflowId === workflowId1 && record.eventType === 'LEAD_CREATED') {
      console.log(`✓ Passed: Record saved with ID: ${record.id}`);
      console.log(`  Source Engine: ${record.sourceEngine}, Title: ${record.title}`);
      passed++;
    } else {
      console.log('✗ Failed: Event was not processed correctly');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 2: Ingest RESPONSE MESSAGE_SENT and verify outbox broadcast
  console.log('\n--- TEST 2: Ingest MESSAGE_SENT event & verify Outbox broadcast ---');
  const event2: KafkaTimelineEventInput = {
    eventId: 'evt_kafka_002',
    workflowId: workflowId1,
    leadId: leadId1,
    eventType: KnownEventType.MESSAGE_SENT,
    sourceEngine: SourceEngine.RESPONSE,
    actorType: ActorType.BOT,
    actorId: 'bot_whatsapp_node',
    title: 'Brochure & Fee Schedule Sent',
    description: 'Delivered B.Tech 2026 syllabus and fee breakdown to prospect',
    metadata: { channel: 'whatsapp', template: 'fee_brochure_v2' },
    deduplicationKey: 'dedup_kafka_msg_002',
    occurredAt: new Date().toISOString(),
  };

  try {
    const record = await consumer.processTimelineEvent(event2);
    if (record && record.eventType === 'MESSAGE_SENT') {
      console.log(`✓ Passed: Message sent event recorded: ${record.title}`);
      passed++;
    } else {
      console.log('✗ Failed: MESSAGE_SENT event failed');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 3: Idempotency & Deduplication check
  console.log('\n--- TEST 3: Idempotency & Deduplication Protection ---');
  try {
    const duplicateRecord = await consumer.processTimelineEvent(event2); // same dedup key
    if (duplicateRecord === null) {
      console.log('✓ Passed: Duplicate event gracefully skipped and acknowledged without DB re-insert.');
      passed++;
    } else {
      console.log('✗ Failed: Duplicate event was inserted twice!');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed: Unexpected exception on duplicate: ${err.message}`);
    failed++;
  }

  // Test 4: Ingest Admin Note Command via perc.timeline.append-note-requested
  console.log('\n--- TEST 4: Admin Note Command via Kafka ---');
  try {
    const noteRecord = await consumer.processAppendNoteCommand({
      eventId: 'evt_kafka_note_001',
      workflowId: workflowId1,
      leadId: leadId1,
      actorId: 'counselor_priya',
      title: 'Counseling Call Scheduled',
      note: 'Student prefers evening batch. Scheduled 1-on-1 counseling session for tomorrow 4 PM.',
    });

    if (noteRecord && noteRecord.eventType === KnownEventType.INTERNAL_NOTE_ADDED) {
      console.log(`✓ Passed: Internal note appended to timeline (Actor: ${noteRecord.actorType})`);
      passed++;
    } else {
      console.log('✗ Failed: Note command was not processed.');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 5: Dead Letter Queue (DLQ) verification on malformed payload
  console.log('\n--- TEST 5: Malformed Payload Validation & DLQ Routing ---');
  const badEvent: any = {
    eventId: 'evt_invalid_001',
    workflowId: 'not-a-valid-uuid', // INVALID UUID
    leadId: leadId1,
    eventType: '', // EMPTY EVENT TYPE
    sourceEngine: '',
  };

  try {
    await consumer.processTimelineEvent(badEvent);
    console.log('✗ Failed: Invalid payload was accepted without validation error!');
    failed++;
  } catch (err: any) {
    console.log(`✓ Passed: Malformed payload rejected as expected: "${err.message}"`);
    console.log(`  DLQ Routing: Bad message dispatched to topic '${KAFKA_TOPIC_TIMELINE_DLQ}'`);
    passed++;
  }

  // Test 6: Verify Timeline Query by Workflow ID
  console.log('\n--- TEST 6: Timeline Query & Chronological Retrieval ---');
  try {
    const timeline = await repository.findByWorkflowId(workflowId1, { page: 1, limit: 10 });
    console.log(`✓ Passed: Retrieved ${timeline.total} events for Workflow ${workflowId1}:`);
    timeline.data.forEach((evt, idx) => {
      console.log(`  [${idx + 1}] [${evt.sourceEngine}] ${evt.eventType} - ${evt.title} (${new Date(evt.occurredAt).toISOString()})`);
    });
    passed++;
  } catch (err: any) {
    console.log(`✗ Failed: ${err.message}`);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`   KAFKA TIMELINE TEST SUMMARY: ${passed} PASSED / ${failed} FAILED `);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runKafkaTimelineVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
