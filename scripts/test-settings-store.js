const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testStore() {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'test_key',
      value: JSON.stringify([{ id: '1', text: 'hello' }]),
    });
  console.log('Upsert result:', error ? error.message : 'OK');

  const { data: readData } = await supabase.from('app_settings').select('*').eq('key', 'test_key');
  console.log('Read data:', readData);
}

testStore();
