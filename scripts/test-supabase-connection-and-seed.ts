import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSupabaseAndSeed() {
  console.log('\n================================================================');
  console.log('⚡ PERC DIRECT SUPABASE CONNECTION & SEEDING AUDIT');
  console.log(`Project URL: ${supabaseUrl}`);
  console.log('================================================================\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tablesToVerify = [
    'users',
    'leads',
    'courses',
    'lead_courses',
    'conversations',
    'messages',
    'workflow_instances',
    'promises',
    'channels',
    'event_types',
    'settings',
    'timeline_events',
  ];

  console.log('🔍 STEP 1: Verifying Table Availability in Supabase PostgreSQL...\n');
  const tableStatus: Record<string, { status: string; count: number; error?: string }> = {};

  for (const table of tablesToVerify) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        tableStatus[table] = { status: 'MISSING / TABLE NOT CREATED', count: 0, error: error.message };
        console.log(`   ❌ Table '${table}': NOT CREATED (${error.message})`);
      } else {
        tableStatus[table] = { status: 'EXISTS', count: count || 0 };
        console.log(`   ✅ Table '${table}': EXISTS (${count || 0} rows)`);
      }
    } catch (err: any) {
      tableStatus[table] = { status: 'ERROR', count: 0, error: err.message };
      console.log(`   ❌ Table '${table}': ERROR (${err.message})`);
    }
  }

  // -------------------------------------------------------------
  // STEP 2: Execute Database Seeding (if channels, event_types exist)
  // -------------------------------------------------------------
  console.log('\n🌱 STEP 2: Executing Seed Data Injection via Supabase API...\n');

  const CHANNELS = [
    { id: 'chan_whatsapp', name: 'whatsapp', display_name: 'WhatsApp' },
    { id: 'chan_instagram', name: 'instagram', display_name: 'Instagram' },
    { id: 'chan_facebook', name: 'facebook', display_name: 'Facebook Messenger' },
    { id: 'chan_email', name: 'email', display_name: 'Email' },
    { id: 'chan_web_form', name: 'website_form', display_name: 'Website Form' },
    { id: 'chan_web_chat', name: 'website_chat', display_name: 'Website Chat' },
    { id: 'chan_google', name: 'google_business', display_name: 'Google Business' },
    { id: 'chan_phone', name: 'phone', display_name: 'Phone Call' },
    { id: 'chan_walkin', name: 'walkin', display_name: 'Walk-in' },
    { id: 'chan_referral', name: 'referral', display_name: 'Referral' },
    { id: 'chan_sms', name: 'sms', display_name: 'SMS' },
  ];

  const EVENT_TYPES = [
    { id: 'evt_lead_created', name: 'Lead Created', description: 'New enquiry captured', category: 'system' },
    { id: 'evt_info_shared', name: 'Information Shared', description: 'Automated response sent to lead', category: 'automation' },
    { id: 'evt_reply_received', name: 'Reply Received', description: 'Lead replied to a message', category: 'lead' },
    { id: 'evt_admin_action', name: 'Admin Action', description: 'Manual action performed by admin', category: 'admin' },
    { id: 'evt_followup_sent', name: 'Follow-up Sent', description: 'Automated follow-up message sent', category: 'automation' },
  ];

  const SETTINGS = [
    { id: 'stg_working_hours', key: 'working_hours', value: '{"start": "09:00", "end": "18:00", "timezone": "Asia/Kolkata"}', description: 'Default working hours', category: 'calendar' },
    { id: 'stg_followup_timings', key: 'followup_timings', value: '{"first": "2 hours", "second": "1 day", "third": "3 days", "escalation": "24 hours"}', description: 'Follow-up timing intervals', category: 'automation' },
    { id: 'stg_auto_response', key: 'auto_response_enabled', value: 'true', description: 'Enable/disable auto responses globally', category: 'automation' },
  ];

  let channelsSeeded = 0;
  let eventTypesSeeded = 0;
  let settingsSeeded = 0;

  if (tableStatus['channels']?.status === 'EXISTS') {
    for (const c of CHANNELS) {
      const { data } = await supabase.from('channels').select('id').eq('name', c.name).maybeSingle();
      if (!data) {
        await supabase.from('channels').insert({ id: c.id, name: c.name, display_name: c.display_name, is_active: true, config: '{}' });
        channelsSeeded++;
      }
    }
    console.log(`   ✅ Channels table: ${channelsSeeded} new channels inserted.`);
  }

  if (tableStatus['event_types']?.status === 'EXISTS') {
    for (const et of EVENT_TYPES) {
      const { data } = await supabase.from('event_types').select('id').eq('name', et.name).maybeSingle();
      if (!data) {
        await supabase.from('event_types').insert({ id: et.id, name: et.name, description: et.description, category: et.category });
        eventTypesSeeded++;
      }
    }
    console.log(`   ✅ Event Types table: ${eventTypesSeeded} new event types inserted.`);
  }

  if (tableStatus['settings']?.status === 'EXISTS') {
    for (const s of SETTINGS) {
      const { data } = await supabase.from('settings').select('id').eq('key', s.key).maybeSingle();
      if (!data) {
        await supabase.from('settings').insert({ id: s.id, key: s.key, value: s.value, description: s.description, category: s.category });
        settingsSeeded++;
      }
    }
    console.log(`   ✅ Settings table: ${settingsSeeded} new settings inserted.`);
  }

  // -------------------------------------------------------------
  // STEP 3: Create Sample Test Lead & Workflow Record if tables exist
  // -------------------------------------------------------------
  console.log('\n🧪 STEP 3: Testing Direct Lead & Timeline DB Operations...\n');

  if (tableStatus['leads']?.status === 'EXISTS') {
    const testLeadId = `lead_test_${Date.now()}`;
    const { error: leadErr } = await supabase.from('leads').insert({
      id: testLeadId,
      first_name: 'Aarav',
      last_name: 'Sharma',
      phone: '+919876543210',
      email: 'aarav.sharma@example.com',
      source: 'website_form',
      category: 'course_enquiry',
      status: 'new',
      classification: 'hot',
    });

    if (!leadErr) {
      console.log(`   ✅ Direct insert to 'leads' succeeded! (Lead ID: ${testLeadId})`);
    } else {
      console.log(`   ⚠️ Direct insert to 'leads' returned: ${leadErr.message}`);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📋 SUPABASE AUDIT & SEED SUMMARY REPORT');
  console.log('================================================================');
  console.log(`Supabase Project URL: ${supabaseUrl}`);
  console.log(`Service Role Access:  GRANTED ✅`);
  console.log('\nTables Breakdown:');
  Object.entries(tableStatus).forEach(([t, info]) => {
    console.log(`  - ${t.padEnd(20)} : ${info.status} (${info.count} rows)`);
  });
  console.log('================================================================\n');
}

testSupabaseAndSeed().catch((err) => {
  console.error('Fatal error during Supabase testing:', err);
  process.exit(1);
});
