import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNotificationSupabase() {
  console.log('\n================================================================');
  console.log('⚡ ENGINE 8 (NOTIFICATION ENGINE) — SUPABASE DATABASE AUDIT');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('================================================================\n');

  // 1. Ensure Default User Exists (satisfying Foreign Key constraints)
  console.log('👤 STEP 1: Ensuring Default Admin User Exists in Supabase...');
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const { data: userCheck } = await supabase.from('users').select('id').eq('id', userId).single();

  if (!userCheck) {
    const { error: userInsertErr } = await supabase.from('users').insert([
      {
        id: userId,
        email: 'admin@perc.edu.in',
        name: 'Senior Admissions Director',
        role: 'super_admin',
        phone: '+919876543210',
        is_active: true,
      },
    ]);
    if (userInsertErr) {
      console.warn(`User insert notice: ${userInsertErr.message}`);
    } else {
      console.log(`✅ Default Admin User created in 'users' table!`);
    }
  } else {
    console.log(`✅ Default Admin User '${userId}' verified in Supabase!`);
  }

  // 2. Ensure Default Lead Exists
  console.log('📋 STEP 2: Ensuring Default Lead Record Exists...');
  const leadId = 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38';
  const { data: leadCheck } = await supabase.from('leads').select('id').eq('id', leadId).single();

  if (!leadCheck) {
    const { error: leadInsertErr } = await supabase.from('leads').insert([
      {
        id: leadId,
        first_name: 'Aarav',
        last_name: 'Sharma',
        phone: '+919876543211',
        email: 'aarav.sharma@example.com',
        source: 'website_form',
        status: 'new',
        assigned_to: userId,
      },
    ]);
    if (leadInsertErr) {
      console.warn(`Lead insert notice: ${leadInsertErr.message}`);
    } else {
      console.log(`✅ Default Lead created in 'leads' table!`);
    }
  } else {
    console.log(`✅ Default Lead '${leadId}' verified in Supabase!`);
  }

  // 3. Seed notification record directly into Supabase
  console.log('\n🌱 STEP 3: Seeding Test Notification into Supabase Database...');
  const testId = `88888888-8888-4888-8888-${Date.now().toString().slice(-12)}`;

  const seedPayload = {
    id: testId,
    user_id: userId,
    lead_id: leadId,
    notification_type: 'meeting_missed',
    title: 'CRITICAL: Missed Admissions Call Alert (Supabase Direct Audit)',
    message: 'Admissions Counselor missed scheduled demo session with student parent.',
    is_read: false,
    priority: 'critical',
    metadata: JSON.stringify({ source: 'supabase_audit_script', timestamp: new Date().toISOString() }),
    created_at: new Date().toISOString(),
  };

  const { data: insertData, error: insertErr } = await supabase
    .from('notifications')
    .insert([seedPayload])
    .select();

  if (insertErr) {
    console.error(`❌ DB Insertion Failed: ${insertErr.message}`);
    process.exit(1);
  }
  console.log(`✅ Successfully inserted notification ID '${testId}' into Supabase!\n`);

  // 4. Query back inserted notification
  console.log('📋 STEP 4: Verifying Database Record Retrieval & Status Updates...');
  const { data: queryData, error: queryErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', testId)
    .single();

  if (queryErr || !queryData) {
    console.error(`❌ DB Query Failed: ${queryErr?.message}`);
    process.exit(1);
  }
  console.log(`   Fetched Record from Supabase:`);
  console.log(`     - Title:             ${queryData.title}`);
  console.log(`     - Notification Type: ${queryData.notification_type}`);
  console.log(`     - Priority:          ${queryData.priority}`);
  console.log(`     - User ID:           ${queryData.user_id}`);
  console.log(`     - Is Read:           ${queryData.is_read}`);

  // 5. Update Read Status
  const { error: updateErr } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', testId);

  if (updateErr) {
    console.error(`❌ DB Update Failed: ${updateErr.message}`);
    process.exit(1);
  }
  console.log(`   Updated Record: 'is_read' set to TRUE in Supabase PostgreSQL!\n`);

  console.log('================================================================');
  console.log('🎉 SUPABASE DB VERIFICATION COMPLETE — 100% OPERATIONAL');
  console.log('================================================================\n');
}

testNotificationSupabase().catch((err) => {
  console.error('Fatal error during Supabase audit:', err);
  process.exit(1);
});
