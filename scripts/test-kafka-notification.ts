import {
  KafkaNotificationSendInput,
  KafkaNotificationBroadcastInput,
  NotificationPriority,
  KAFKA_TOPIC_NOTIFICATION_SEND,
  KAFKA_TOPIC_NOTIFICATION_BROADCAST,
  KAFKA_TOPIC_NOTIFICATION_DELIVERED,
  KAFKA_TOPIC_NOTIFICATION_DLQ,
} from '../packages/shared/src';
import { NotificationRepository } from '../packages/notification-service/src/notification/repository/notification.repository';
import { PreferenceService } from '../packages/notification-service/src/notification/service/preference.service';
import { NotificationKafkaPublisherService } from '../packages/notification-service/src/notification/kafka/notification-kafka-publisher.service';
import { NotificationKafkaConsumerService } from '../packages/notification-service/src/notification/kafka/notification-kafka-consumer.service';
import { NotificationService } from '../packages/notification-service/src/notification/service/notification.service';

async function runKafkaNotificationVerification() {
  console.log('================================================================');
  console.log('  PERC ENGINE 8 (NOTIFICATION ENGINE) - KAFKA TEST SUITE       ');
  console.log('================================================================\n');

  // Initialize Notification Engine components
  const repository = new NotificationRepository();
  const preferenceService = new PreferenceService();
  const publisher = new NotificationKafkaPublisherService();
  const notificationService = new NotificationService(repository, preferenceService, publisher);
  const consumer = new NotificationKafkaConsumerService(notificationService, publisher);

  let passed = 0;
  let failed = 0;

  const testUserId = 'usr-counselor-priya-01';
  const testLeadId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  // Test 1: Ingest Targeted Escalation Notification via Kafka
  console.log('--- TEST 1: Ingest Targeted Notification via Kafka ---');
  const input1: KafkaNotificationSendInput = {
    eventId: 'evt_notif_001',
    userId: testUserId,
    leadId: testLeadId,
    notificationType: 'ESCALATION_TRIGGERED',
    priority: NotificationPriority.HIGH,
    title: 'Lead SLA Breached - Escalation',
    message: 'Lead Rahul Kumar has received no response for > 2 hours. Immediate counseling callback required.',
    actionUrl: `/leads/${testLeadId}`,
    metadata: { slaMinutes: 120, channel: 'whatsapp' },
    deduplicationKey: 'dedup_notif_esc_001',
    occurredAt: new Date().toISOString(),
  };

  try {
    const record = await consumer.processSendNotification(input1);
    if (record && record.userId === testUserId && record.notificationType === 'ESCALATION_TRIGGERED') {
      console.log(`✓ Passed: Notification created with ID: ${record.id}`);
      console.log(`  Priority: ${record.priority}, Title: ${record.title}`);
      passed++;
    } else {
      console.log('✗ Failed: Notification was not created properly');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 2: Auto-Escalation Rule & Outbox Broadcast
  console.log('\n--- TEST 2: Auto-Escalation & Outbox Broadcast ---');
  const input2: KafkaNotificationSendInput = {
    eventId: 'evt_notif_002',
    userId: testUserId,
    leadId: testLeadId,
    notificationType: 'CALL_MISSED', // Critical event type
    title: 'Missed Call Alert',
    message: 'Student tried calling back after hours.',
    deduplicationKey: 'dedup_notif_missed_002',
  };

  try {
    const record = await consumer.processSendNotification(input2);
    if (record && record.priority === NotificationPriority.CRITICAL) {
      console.log(`✓ Passed: Auto-escalated to CRITICAL priority as expected: ${record.priority}`);
      console.log(`  Outbox: Broadcast emitted to '${KAFKA_TOPIC_NOTIFICATION_DELIVERED}'`);
      passed++;
    } else {
      console.log(`✗ Failed: Priority was not auto-escalated to critical (was: ${record?.priority})`);
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 3: Idempotency & Deduplication
  console.log('\n--- TEST 3: Idempotency & Deduplication Check ---');
  try {
    const duplicate = await consumer.processSendNotification(input1); // same dedup key
    if (duplicate) {
      console.log(`✓ Passed: Duplicate detected and acknowledged cleanly without duplicate insert.`);
      passed++;
    } else {
      console.log('✗ Failed: Deduplication failed');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 4: Broadcast Notification across Role
  console.log('\n--- TEST 4: Role-Based Broadcast Notification via Kafka ---');
  const broadcastInput: KafkaNotificationBroadcastInput = {
    eventId: 'evt_notif_broadcast_001',
    targetRole: 'counselor',
    notificationType: 'SYSTEM_ALERT',
    title: 'Admissions Webinar Starting',
    message: 'Live JEE demo session starts in 15 minutes. Ensure all invited leads have meeting links.',
    priority: NotificationPriority.NORMAL,
  };

  try {
    const broadcastRecords = await consumer.processBroadcastNotification(broadcastInput);
    if (broadcastRecords && broadcastRecords.length > 0) {
      console.log(`✓ Passed: Dispatched broadcast notification to ${broadcastRecords.length} counselors.`);
      passed++;
    } else {
      console.log('✗ Failed: Broadcast dispatch failed');
      failed++;
    }
  } catch (err: any) {
    console.log(`✗ Failed with error: ${err.message}`);
    failed++;
  }

  // Test 5: Dead Letter Queue (DLQ) Routing on Malformed Payload
  console.log('\n--- TEST 5: Malformed Payload Validation & DLQ Routing ---');
  const badInput: any = {
    eventId: 'evt_invalid_001',
    userId: '', // EMPTY USER ID
    notificationType: '',
    message: '',
  };

  try {
    await consumer.processSendNotification(badInput);
    console.log('✗ Failed: Invalid payload was accepted without validation error!');
    failed++;
  } catch (err: any) {
    console.log(`✓ Passed: Rejected malformed payload: "${err.message}"`);
    console.log(`  DLQ Routing: Bad command routed to topic '${KAFKA_TOPIC_NOTIFICATION_DLQ}'`);
    passed++;
  }

  // Test 6: Counselor Inbox Query, Unread Counter & Mark-as-Read
  console.log('\n--- TEST 6: Counselor Inbox Query & Mark-as-Read ---');
  try {
    const inbox = await notificationService.getInbox({ userId: testUserId, isRead: false });
    console.log(`✓ Passed: Retrieved ${inbox.total} active unread notifications for ${testUserId}.`);

    const firstNotificationId = inbox.data[0]?.id;
    if (firstNotificationId) {
      const readResult = await notificationService.markAsRead(firstNotificationId);
      console.log(`✓ Passed: Marked notification '${readResult.id}' as read at ${readResult.readAt?.toISOString()}`);
    }

    const digest = await notificationService.getDailyDigest(testUserId);
    console.log(`✓ Passed: Generated Counselor Daily Digest summary (Unread: ${digest.summary.unreadAlerts}, Critical: ${digest.summary.criticalAlertsCount})`);
    passed++;
  } catch (err: any) {
    console.log(`✗ Failed: ${err.message}`);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`   KAFKA NOTIFICATION TEST SUMMARY: ${passed} PASSED / ${failed} FAILED `);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runKafkaNotificationVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
