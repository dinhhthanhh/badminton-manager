const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Creating tables using Supabase Admin Client...');

  // 1. Create court_bills table by using sql rest if enabled or direct query
  const res1 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      sql: `
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

        CREATE TABLE IF NOT EXISTS public.admin_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_admin_reply BOOLEAN DEFAULT FALSE,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
  });

  console.log('RPC status:', res1.status);
}

run();
