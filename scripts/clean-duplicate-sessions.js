const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanDuplicateSessions() {
  console.log('Cleaning duplicate sessions for same date...');
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, date, created_at')
    .order('created_at', { ascending: false });

  if (error || !sessions) {
    console.error('Fetch error:', error);
    return;
  }

  const seenDates = new Set();
  const toDelete = [];

  for (const s of sessions) {
    if (seenDates.has(s.date)) {
      toDelete.push(s.id);
    } else {
      seenDates.add(s.date);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate sessions:`, toDelete);
    const { error: delErr } = await supabase.from('sessions').delete().in('id', toDelete);
    if (delErr) console.error('Delete error:', delErr);
    else console.log('Cleaned duplicate sessions successfully!');
  } else {
    console.log('No duplicate sessions found.');
  }
}

cleanDuplicateSessions();
