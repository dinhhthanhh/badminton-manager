'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isRegistrationOpen, getCancellationType } from '@/lib/utils/date';
import { DEFAULT_SETTINGS } from '@/lib/config';

/**
 * Register the current user for a session
 */
export async function registerForSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Check user is approved
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  if (profile?.status !== 'APPROVED') {
    return { success: false, error: 'Your account must be approved to register' };
  }

  // Get session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return { success: false, error: 'Session not found' };

  // Check registration is open
  if (!isRegistrationOpen(session.registration_open_at, session.registration_close_at)) {
    // Check if before open time
    if (session.registration_open_at && new Date() < new Date(session.registration_open_at)) {
      return { success: false, error: 'Registration is not open yet' };
    }
    return { success: false, error: 'Registration is closed' };
  }

  if (session.status === 'CANCELLED') {
    return { success: false, error: 'This session has been cancelled' };
  }

  if (session.status === 'FINALIZED') {
    return { success: false, error: 'This session has already been finalized' };
  }

  // Check max players
  if (session.max_players) {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .neq('status', 'CANCELLED');

    if (count && count >= session.max_players) {
      return { success: false, error: 'Session is full' };
    }
  }

  // Check duplicate registration
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.status === 'CANCELLED') {
      // Re-register by updating status
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'REGISTERED',
          registered_at: new Date().toISOString(),
          cancelled_at: null,
          cancellation_reason: null,
          cancellation_type: null,
        })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      return { success: false, error: 'You have already registered for this session' };
    }
  } else {
    // New registration
    const { error } = await supabase
      .from('registrations')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        status: 'REGISTERED',
      });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

/**
 * Cancel registration
 */
export async function cancelRegistration(
  sessionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Chưa đăng nhập' };

  // Get registration
  const { data: registration } = await supabase
    .from('registrations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!registration) {
    return { success: false, error: 'Không tìm thấy thông tin đăng ký' };
  }

  if (registration.status !== 'REGISTERED') {
    return { success: false, error: 'Không thể hủy đăng ký này' };
  }

  // Get session
  const { data: session } = await supabase
    .from('sessions')
    .select('date, start_time, status')
    .eq('id', sessionId)
    .single();

  if (!session) return { success: false, error: 'Không tìm thấy buổi tập' };

  if (session.status === 'FINALIZED') {
    return { success: false, error: 'Buổi tập này đã được chốt chi phí' };
  }

  const { isWithin24Hours } = await import('@/lib/utils/date');
  const in24Hours = isWithin24Hours(session.date, session.start_time);

  if (in24Hours && (!reason || !reason.trim())) {
    return { success: false, error: 'Hủy đăng ký trong vòng 24 giờ trước giờ tập bắt buộc phải nhập lý do' };
  }

  const cancellationReason = reason?.trim() || 'Hủy tự do (trước 24 giờ)';

  const cancellationType = getCancellationType(
    session.date,
    session.start_time,
    DEFAULT_SETTINGS.lateCancellationHours
  );

  const { error } = await supabase
    .from('registrations')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason,
      cancellation_type: cancellationType,
    })
    .eq('id', registration.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

/**
 * Update attendance status (admin only)
 */
export async function updateAttendance(
  registrationId: string,
  status: 'ATTENDED' | 'ABSENT' | 'NO_SHOW'
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('registrations')
    .update({ status })
    .eq('id', registrationId);

  if (error) throw error;
}

/**
 * Update sets played (admin only)
 */
export async function updateSetsPlayed(
  registrationId: string,
  setsPlayed: number
): Promise<void> {
  const supabase = await createClient();

  if (setsPlayed < 0) throw new Error('Sets must be 0 or greater');

  const { error } = await supabase
    .from('registrations')
    .update({ sets_played: setsPlayed })
    .eq('id', registrationId);

  if (error) throw error;
}

/**
 * Get user's registrations with session details
 */
export async function getUserRegistrations(
  userId: string,
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from('registrations')
      .select(`
        *,
        sessions:session_id (
          id, date, start_time, end_time, court_name, status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getUserRegistrations] Error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[getUserRegistrations] Exception:', err);
    return [];
  }
}
