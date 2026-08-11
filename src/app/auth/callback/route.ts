import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/schedule';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Use admin client to query profile to avoid RLS race condition during signup
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from('profiles')
          .select('status, role')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.status === 'PENDING') {
            return NextResponse.redirect(`${origin}/pending`);
          }
          if (profile.status === 'BLOCKED' || profile.status === 'REJECTED') {
            return NextResponse.redirect(`${origin}/blocked`);
          }
          if (profile.role === 'ADMIN') {
            return NextResponse.redirect(`${origin}/admin/dashboard`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
