const { Client } = require('pg');

async function fixRLS() {
  const connectionString = 'postgresql://postgres:Dinhthanh3004@db.hbvdfdiazmgtyqblyqxm.supabase.co:5432/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    const sql = `
      -- Helper functions with SECURITY DEFINER to prevent RLS infinite recursion (42P17)
      CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = user_id AND role = 'ADMIN'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

      CREATE OR REPLACE FUNCTION public.is_approved(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = user_id AND status = 'APPROVED'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

      -- Drop old recursive policies on profiles
      DROP POLICY IF EXISTS "Approved users can read approved profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

      -- Create new non-recursive policies
      CREATE POLICY "Approved users can read approved profiles"
        ON public.profiles FOR SELECT
        USING (status = 'APPROVED');

      CREATE POLICY "Admins can read all profiles"
        ON public.profiles FOR SELECT
        USING (public.is_admin(auth.uid()));

      CREATE POLICY "Admins can update all profiles"
        ON public.profiles FOR UPDATE
        USING (public.is_admin(auth.uid()));
    `;

    console.log('Applying RLS fix SQL...');
    await client.query(sql);
    console.log('SUCCESS: RLS infinite recursion fix applied!');
  } catch (err) {
    console.error('RLS Fix error:', err);
  } finally {
    await client.end();
  }
}

fixRLS();
