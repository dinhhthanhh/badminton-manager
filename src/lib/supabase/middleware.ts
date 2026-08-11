import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Unprotected public paths
  const publicPaths = ['/', '/login', '/auth/callback', '/pending', '/blocked'];
  const isPublicPath = publicPaths.includes(pathname);

  // 1. If not authenticated and trying to access protected path -> redirect to /login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. If authenticated, fetch or auto-create profile
  if (user) {
    let profile = null;
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from('profiles')
        .select('status, role')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        profile = data;
      } else {
        // Auto-create missing profile row
        const meta = user.user_metadata || {};
        const { data: newProfile } = await adminClient
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
            avatar_url: meta.avatar_url || meta.picture || null,
            role: 'USER',
            status: 'PENDING',
          })
          .select('status, role')
          .single();

        profile = newProfile || { status: 'PENDING', role: 'USER' };
      }
    } catch (e) {
      console.error('[Middleware] Profile fetch error:', e);
    }

    if (profile) {
      // Pending user
      if (profile.status === 'PENDING') {
        if (pathname !== '/pending' && !pathname.startsWith('/auth/callback')) {
          const url = request.nextUrl.clone();
          url.pathname = '/pending';
          return NextResponse.redirect(url);
        }
      }
      // Blocked / Rejected user
      else if (profile.status === 'BLOCKED' || profile.status === 'REJECTED') {
        if (pathname !== '/blocked' && !pathname.startsWith('/auth/callback')) {
          const url = request.nextUrl.clone();
          url.pathname = '/blocked';
          return NextResponse.redirect(url);
        }
      }
      // Approved user visiting /login or /pending or /blocked -> redirect to /schedule
      else if (profile.status === 'APPROVED') {
        if (pathname === '/login' || pathname === '/pending' || pathname === '/blocked') {
          const url = request.nextUrl.clone();
          url.pathname = profile.role === 'ADMIN' ? '/admin/dashboard' : '/schedule';
          return NextResponse.redirect(url);
        }
        // Non-admin trying to access /admin -> redirect to /schedule
        if (pathname.startsWith('/admin') && profile.role !== 'ADMIN') {
          const url = request.nextUrl.clone();
          url.pathname = '/schedule';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
