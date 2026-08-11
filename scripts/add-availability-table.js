const { Client } = require('pg');

async function addAvailabilityTable() {
  const connectionString = 'postgresql://postgres:Dinhthanh3004@db.hbvdfdiazmgtyqblyqxm.supabase.co:5432/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    const sql = `
      -- Table for member time slot availability registrations
      CREATE TABLE IF NOT EXISTS public.availability_slots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, date, start_time)
      );

      -- RLS
      ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

      -- Read policy: Everyone approved can see slots
      DROP POLICY IF EXISTS "Anyone approved can read availability_slots" ON public.availability_slots;
      CREATE POLICY "Anyone approved can read availability_slots"
        ON public.availability_slots FOR SELECT
        USING (true);

      -- Insert policy: Users can insert their own slots
      DROP POLICY IF EXISTS "Users can insert own availability_slots" ON public.availability_slots;
      CREATE POLICY "Users can insert own availability_slots"
        ON public.availability_slots FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      -- Delete policy: Users can delete their own slots
      DROP POLICY IF EXISTS "Users can delete own availability_slots" ON public.availability_slots;
      CREATE POLICY "Users can delete own availability_slots"
        ON public.availability_slots FOR DELETE
        USING (auth.uid() = user_id);
    `;

    console.log('Applying availability_slots SQL migration...');
    await client.query(sql);
    console.log('SUCCESS: availability_slots table created!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

addAvailabilityTable();
