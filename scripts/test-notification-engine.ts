import { NotificationClient } from '../packages/shared/src/notification-client';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const client = new NotificationClient(NOTIFICATION_URL);

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_LEAD_ID = 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38';

async function runNotificationEngineTest() {
  console.log('\n================================================================');
  console.log('🚀 PERC ENGINE 8 — NOTIFICATION ENGINE REAL-TIME TEST');
  console.log(`Target Service: ${NOTIFICATION_URL}`);
  console.log(`Test User ID:   ${TEST_USER_ID}`);
  console.log(`Test Lead ID:   ${TEST_LEAD_ID}`);
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // -------------------------------------------------------------
  // STEP 1: Dispatch Alerts from All 7 Producer Subsystems
  // -------------------------------------------------------------
  const alertsToDispatch = [
    {
      sourceEngine: 'Engine 1 (Lead Capture)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'LEAD_CREATED',
        title: 'New High Priority Lead Captured',
        message: 'Inquiry for B.Tech CS captured from Google Search Ads campaign.',
        priority: 'HIGH',
      },
    },
    {
      sourceEngine: 'Engine 2 (Response Template)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'BROCHURE_SHARED',
        title: 'WhatsApp PDF Delivery Confirmed',
        message: '2026 CS Curriculum PDF delivered to prospect on WhatsApp.',
        priority: 'LOW',
      },
    },
    {
      sourceEngine: 'Engine 3 (Workflow Engine)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'STATE_CHANGED',
        title: 'Lead Pipeline Stage Advanced',
        message: 'Lead stage moved from NEW_INQUIRY -> ENGAGED.',
        priority: 'MEDIUM',
      },
    },
    {
      sourceEngine: 'Engine 4 (Scheduler Engine)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'REMINDER_DUE',
        title: 'Urgent Counselor Follow-up Due',
        message: 'Scheduled call reminder with parent regarding Merit Scholarship.',
        priority: 'HIGH',
      },
    },
    {
      sourceEngine: 'Engine 6 (Follow-up Engine)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'FOLLOWUP_OVERDUE',
        title: 'Stalled Inquiry Re-engagement',
        message: 'Automated re-engagement SMS dispatched to inactive lead.',
        priority: 'MEDIUM',
      },
    },
    {
      sourceEngine: 'Engine 7 (Meeting & Call)',
      payload: {
        userId: TEST_USER_ID,
        leadId: TEST_LEAD_ID,
        notificationType: 'CALL_MISSED',
        title: 'CRITICAL: Missed Counseling Call Alert',
        message: 'Counselor missed 1-on-1 demo session with prospect Aarav Sharma.',
        priority: 'CRITICAL',
      },
    },
  ];

  console.log('📡 STEP 1: Dispatching Alerts Across All Subsystem Engines...\n');

  let sampleNotificationId = '';

  for (const item of alertsToDispatch) {
    totalTests++;
    process.stdout.write(`   [${item.sourceEngine}] Dispatching '${item.payload.notificationType}'... `);
    const res = await client.sendNotification(item.payload as any);

    if (res.success && res.data) {
      passedTests++;
      sampleNotificationId = res.data.id;
      console.log(`✅ OK (ID: ${res.data.id} | Priority: ${res.data.priority})`);
    } else {
      console.log(`❌ FAILED: ${res.error || res.message}`);
    }
  }

  // -------------------------------------------------------------
  // STEP 2: Query User Notification Inbox Feed
  // -------------------------------------------------------------
  console.log('\n📥 STEP 2: Querying User Notification Inbox...');
  totalTests++;
  process.stdout.write(`   Fetching inbox for User '${TEST_USER_ID}'... `);
  const inboxRes = await client.getUserNotifications(TEST_USER_ID, { limit: 50 });

  if (inboxRes.success && Array.isArray(inboxRes.data)) {
    passedTests++;
    console.log(`✅ OK (${inboxRes.data.length} total notifications retrieved)`);
  } else {
    console.log(`❌ Inbox query failed: ${inboxRes.error}`);
  }

  // -------------------------------------------------------------
  // STEP 3: Test Marking Specific Notification as Read
  // -------------------------------------------------------------
  if (sampleNotificationId) {
    console.log('\n✓ STEP 3: Testing Mark Notification as Read...');
    totalTests++;
    process.stdout.write(`   Updating read status for Notification '${sampleNotificationId}'... `);
    const readRes = await client.markAsRead(sampleNotificationId);

    if (readRes.success && readRes.data && readRes.data.isRead) {
      passedTests++;
      console.log(`✅ OK (isRead: true)`);
    } else {
      console.log(`❌ Mark read failed: ${readRes.error}`);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎯 TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log('✨ Engine 8 (Notification Engine) is working correctly in real time!');
  } else {
    console.log('⚠️ Some notification tests encountered errors.');
  }
  console.log('================================================================\n');
}

runNotificationEngineTest().catch((err) => {
  console.error('Fatal error during notification engine test:', err);
  process.exit(1);
});
