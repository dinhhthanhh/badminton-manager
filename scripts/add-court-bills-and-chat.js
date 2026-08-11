const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupTables() {
  console.log('Setting up court_bills and admin_messages tables...');

  // 1. Create court_bills table
  const createBillsSql = `
    CREATE TABLE IF NOT EXISTS public.court_bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
      submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      court_cost NUMERIC DEFAULT 0,
      shuttlecock_cost NUMERIC DEFAULT 0,
      other_cost NUMERIC DEFAULT 0,
      total_cost NUMERIC DEFAULT 0,
      notes TEXT,
      receipt_url TEXT,
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      reviewed_by UUID REFERENCES public.profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.court_bills ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all for court_bills" ON public.court_bills;
    CREATE POLICY "Allow all for court_bills" ON public.court_bills FOR ALL USING (true) WITH CHECK (true);
  `;

  // 2. Create admin_messages table for chat with admin
  const createChatSql = `
    CREATE TABLE IF NOT EXISTS public.admin_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_admin_reply BOOLEAN DEFAULT FALSE,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all for admin_messages" ON public.admin_messages;
    CREATE POLICY "Allow all for admin_messages" ON public.admin_messages FOR ALL USING (true) WITH CHECK (true);
  `;

  try {
    // Execute RPC or query
    const { error: err1 } = await supabase.rpc('exec_sql', { sql: createBillsSql });
    if (err1) {
      console.log('RPC exec_sql not available, testing direct table access...');
    }

    // Direct check by inserting dummy or checking
    console.log('Checking court_bills table...');
    const { error: bErr } = await supabase.from('court_bills').select('id').limit(1);
    if (bErr) {
      console.log('court_bills table error:', bErr.message);
    } else {
      console.log('court_bills table exists and is accessible!');
    }

    console.log('Checking admin_messages table...');
    const { error: cErr } = await supabase.from('admin_messages').select('id').limit(1);
    if (cErr) {
      console.log('admin_messages table error:', cErr.message);
    } else {
      console.log('admin_messages table exists and is accessible!');
    }
  } catch (err) {
    console.error('Setup error:', err);
  }
}

setupTables();
