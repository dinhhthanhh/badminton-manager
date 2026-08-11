const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testTables() {
  const tables = ['profiles', 'sessions', 'registrations', 'payments', 'notifications', 'app_settings', 'audit_logs', 'court_bills', 'admin_messages'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    console.log(`Table ${table}:`, error ? `ERROR: ${error.message}` : 'OK');
  }
}

testTables();
