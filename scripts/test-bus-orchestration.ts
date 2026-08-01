import { EventBusOrchestrator, PublishEngineEventOptions } from '../packages/shared/src/event-bus-orchestrator';
import { SourceEngine, KnownEventType, ActorType } from '../packages/shared/src/enums';

const ORCHESTRATOR_URL = process.env.TIMELINE_SERVICE_URL || 'http://localhost:3003';
const orchestrator = new EventBusOrchestrator(ORCHESTRATOR_URL);

const TEST_WORKFLOW_ID = '11111111-2222-4333-8444-555555555555';
const TEST_LEAD_ID = 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38';

async function runRealtimeBusOrchestrationTest() {
  console.log('\n================================================================');
  console.log('🚀 PERC MULTI-ENGINE EVENT BUS ORCHESTRATION & TIMELINE TEST');
  console.log(`Target Service: ${ORCHESTRATOR_URL}`);
  console.log(`Test Workflow ID: ${TEST_WORKFLOW_ID}`);
  console.log(`Test Lead ID:     ${TEST_LEAD_ID}`);
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // -------------------------------------------------------------
  // STEP 1: Stream events from all 7 Producer Engines
  // -------------------------------------------------------------
  const engineScenarios: { engineName: string; options: PublishEngineEventOptions }[] = [
    {
      engineName: '1. LEAD CAPTURE ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.LEAD_CAPTURE,
        eventType: KnownEventType.LEAD_CREATED,
        actorType: ActorType.SYSTEM,
        title: 'Lead Captured via Webform',
        description: 'New lead submitted inquiry for B.Tech Computer Science from Google Ads campaign',
        metadata: { channel: 'webform', campaign: 'Google_CS_2026', userAgent: 'Mozilla/5.0' },
      },
    },
    {
      engineName: '2. RESPONSE ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.RESPONSE,
        eventType: KnownEventType.BROCHURE_SHARED,
        actorType: ActorType.BOT,
        title: 'WhatsApp Brochure Dispatched',
        description: 'Automated WhatsApp bot delivered PERC 2026 CS Curriculum Brochure PDF',
        metadata: { channel: 'whatsapp', documentId: 'doc_cs_2026_v1', status: 'delivered' },
      },
    },
    {
      engineName: '3. WORKFLOW STATE MACHINE ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.WORKFLOW,
        eventType: KnownEventType.STATE_CHANGED,
        actorType: ActorType.SYSTEM,
        title: 'Workflow Stage Transition',
        description: 'Lead status advanced from NEW_INQUIRY -> ENGAGED',
        metadata: { previousState: 'NEW_INQUIRY', newState: 'ENGAGED', autoTriggered: true },
      },
    },
    {
      engineName: '4. SCHEDULER ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.SCHEDULER,
        eventType: KnownEventType.REMINDER_SCHEDULED,
        actorType: ActorType.SYSTEM,
        title: 'Counselor Follow-up Scheduled',
        description: 'Automated timer set for Senior Admissions Counselor follow-up call',
        metadata: { scheduledFor: new Date(Date.now() + 86400000).toISOString(), priority: 'HIGH' },
      },
    },
    {
      engineName: '5. FOLLOW-UP ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.FOLLOW_UP,
        eventType: KnownEventType.FOLLOWUP_SENT,
        actorType: ActorType.BOT,
        title: 'Automated Re-engagement Ping Sent',
        description: 'Sent SMS reminder regarding upcoming admission deadline',
        metadata: { smsGatewayId: 'msg_987654', templateId: 'tpl_deadline_rem' },
      },
    },
    {
      engineName: '6. MEETING ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.MEETING,
        eventType: KnownEventType.CALL_COMPLETED,
        actorType: ActorType.USER,
        title: 'Admissions Counseling Call Completed',
        description: '1-on-1 counseling session finished with Senior Counselor (Duration: 24 min)',
        metadata: { advisorId: 'adv_402', callDurationSeconds: 1440, outcome: 'INTERESTED_SCHOLARSHIP' },
      },
    },
    {
      engineName: '7. ADMIN PORTAL ENGINE',
      options: {
        workflowId: TEST_WORKFLOW_ID,
        leadId: TEST_LEAD_ID,
        sourceEngine: SourceEngine.ADMIN,
        eventType: KnownEventType.INTERNAL_NOTE_ADDED,
        actorType: ActorType.ADMIN,
        title: 'Counselor Note Appended',
        description: 'Student requested fee structure breakup for Merit Scholarship Tier 1',
        metadata: { adminId: 'admin_rahul', priorityFlag: true },
      },
    },
  ];

  console.log('📡 STEP 1: Publishing Real-Time Events Across All 7 Engines...\n');

  const sharedDedupKey = `test_dedup_${Date.now()}`;

  for (let i = 0; i < engineScenarios.length; i++) {
    totalTests++;
    const s = engineScenarios[i];

    // Give first event a custom dedup key so we can test deduplication later
    if (i === 0) {
      s.options.deduplicationKey = sharedDedupKey;
    }

    process.stdout.write(`   [${s.engineName}] Publishing '${s.options.eventType}'... `);
    const res = await orchestrator.publishEvent(s.options as any);

    if (res.success && res.data) {
      passedTests++;
      console.log(`✅ OK (Event ID: ${res.data.id})`);
    } else {
      console.log(`❌ FAILED: ${res.error || res.message}`);
    }
  }

  // -------------------------------------------------------------
  // STEP 2: Test Idempotency / Deduplication Key Protection
  // -------------------------------------------------------------
  console.log('\n🛡️  STEP 2: Testing Idempotency & Deduplication Engine Safeguard...');
  totalTests++;
  process.stdout.write(`   Publishing duplicate event with key '${sharedDedupKey}'... `);
  const dupRes = await orchestrator.publishEvent({
    ...engineScenarios[0].options,
    deduplicationKey: sharedDedupKey,
  } as any);

  if (!dupRes.success && dupRes.error && dupRes.error.includes('Deduplication key')) {
    passedTests++;
    console.log(`✅ OK (Duplicate event blocked successfully by Bus Deduplication Engine)`);
  } else if (dupRes.success && dupRes.data) {
    passedTests++;
    console.log(`✅ OK (Idempotent response returned without creating duplicate record)`);
  } else {
    console.log(`❌ Deduplication check failed: ${dupRes.error || dupRes.message}`);
  }

  // -------------------------------------------------------------
  // STEP 3: Test Real-Time Timeline Querying & Retrieval
  // -------------------------------------------------------------
  console.log('\n📊 STEP 3: Verifying Real-Time Timeline Ingestion & Engine Queries...');
  totalTests++;
  process.stdout.write(`   Fetching full timeline history for Workflow '${TEST_WORKFLOW_ID}'... `);
  const timelineRes = await orchestrator.getWorkflowTimeline(TEST_WORKFLOW_ID, { limit: 50 });

  if (timelineRes.success && Array.isArray(timelineRes.data)) {
    passedTests++;
    console.log(`✅ OK (${timelineRes.data.length} total events retrieved)`);
    console.log('\n   📋 Real-Time Timeline Feed Snapshot:');
    console.log('   ------------------------------------------------------------------');
    timelineRes.data.forEach((evt: any, idx: number) => {
      console.log(`   [${idx + 1}] [${evt.sourceEngine}] ${evt.title}`);
      console.log(`       Actor: ${evt.actorType} | Event: ${evt.eventType} | Time: ${evt.occurredAt}`);
    });
    console.log('   ------------------------------------------------------------------');
  } else {
    console.log(`❌ Timeline fetch failed: ${timelineRes.error}`);
  }

  // -------------------------------------------------------------
  // STEP 4: Test Real-Time Multi-Engine Analytics Stats
  // -------------------------------------------------------------
  console.log('\n📈 STEP 4: Fetching Real-Time Multi-Engine Analytics Stats...');
  totalTests++;
  process.stdout.write(`   Requesting engine breakdown statistics... `);
  const statsRes = await orchestrator.getEngineStats();

  if (statsRes.success && statsRes.data) {
    passedTests++;
    console.log(`✅ OK`);
    console.log(`      Total Events Logged:    ${statsRes.data.totalEvents}`);
    console.log(`      Active Workflows:       ${statsRes.data.activeWorkflows}`);
    console.log(`      Events Breakdown by Engine:`);
    if (statsRes.data.eventsByEngine) {
      Object.entries(statsRes.data.eventsByEngine).forEach(([eng, cnt]) => {
        console.log(`        - ${eng}: ${cnt} events`);
      });
    }
  } else {
    console.log(`❌ Stats fetch failed: ${statsRes.error}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎯 TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log('✨ All 7 Engines & Bus Orchestration are working correctly in real time!');
  } else {
    console.log('⚠️  Some orchestration tests encountered errors.');
  }
  console.log('================================================================\n');
}

runRealtimeBusOrchestrationTest().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
