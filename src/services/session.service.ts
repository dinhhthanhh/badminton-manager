'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Session, SessionWithDetails, RegistrationWithProfile } from '@/types';
import { format, addWeeks, startOfWeek, setDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIMEZONE, DEFAULT_SETTINGS } from '@/lib/config';

/**
 * Get upcoming sessions for the dashboard
 */
export async function getUpcomingSessions(limit = 10): Promise<SessionWithDetails[]> {
  const adminClient = createAdminClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: sessions, error } = await adminClient
    .from('sessions')
    .select(`
      *,
      registrations (
        id,
        status,
        user_id,
        sets_played,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      ),
      session_costs (*)
    `)
    .gte('date', today)
    .neq('status', 'CANCELLED')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[getUpcomingSessions] Error:', error);
    return [];
  }

  return (sessions || []).map(mapSessionWithDetails);
}

/**
 * Get a single session with full details
 */
export async function getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('sessions')
    .select(`
      *,
      registrations (
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      ),
      session_costs (*)
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSessionWithDetails(data);
}

/**
 * Get all sessions for admin management
 */
export async function getAllSessions(
  status?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<SessionWithDetails[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('sessions')
    .select(`
      *,
      registrations (
        id,
        status,
        user_id,
        sets_played,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      ),
      session_costs (*)
    `)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }
  if (dateFrom) {
    query = query.gte('date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('date', dateTo);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getAllSessions] Error:', error);
    return [];
  }

  return (data || []).map(mapSessionWithDetails);
}

/**
 * Create a new session (admin only)
 */
export async function createSession(input: {
  date: string;
  startTime: string;
  endTime: string;
  courtName: string;
  maxPlayers?: number;
  notes?: string;
  recurringScheduleId?: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
}): Promise<Session> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      court_name: input.courtName,
      max_players: input.maxPlayers || null,
      notes: input.notes || null,
      recurring_schedule_id: input.recurringScheduleId || null,
      registration_open_at: input.registrationOpenAt || null,
      registration_close_at: input.registrationCloseAt || null,
      status: 'UPCOMING',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create session');
  revalidatePath('/admin/sessions');
  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  return data;
}

/**
 * Update session status (admin only)
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId);

  if (error) throw new Error(error.message || 'Failed to update status');
  revalidatePath('/admin/sessions');
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath('/dashboard');
}

/**
 * Update session costs (admin only)
 */
export async function upsertSessionCosts(
  sessionId: string,
  courtCost: number,
  shuttlecockCost: number,
  otherCost: number,
  calculationMethod: string = 'HYBRID'
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('session_costs')
    .upsert({
      session_id: sessionId,
      court_cost: courtCost,
      shuttlecock_cost: shuttlecockCost,
      other_cost: otherCost,
      calculation_method: calculationMethod,
    }, { onConflict: 'session_id' });

  if (error) throw new Error(error.message || 'Failed to save costs');
  revalidatePath(`/admin/sessions/${sessionId}`);
}

/**
 * Generate sessions from recurring schedules
 */
export async function generateSessionsFromSchedules(
  weeksAhead: number = DEFAULT_SETTINGS.sessionGenerationWeeksAhead
): Promise<number> {
  const adminClient = createAdminClient();

  const { data: schedules, error: schedError } = await adminClient
    .from('recurring_schedules')
    .select('*')
    .eq('is_active', true);

  if (schedError) return 0;
  if (!schedules || schedules.length === 0) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: existingSessions } = await adminClient
    .from('sessions')
    .select('date, recurring_schedule_id')
    .gte('date', today);

  const existingSet = new Set(
    (existingSessions || []).map((s) => `${s.recurring_schedule_id}_${s.date}`)
  );

  const sessionsToCreate: Array<{
    date: string;
    start_time: string;
    end_time: string;
    court_name: string;
    recurring_schedule_id: string;
    status: string;
    registration_open_at: string;
    registration_close_at: string;
    created_by: string;
  }> = [];

  const now = toZonedTime(new Date(), TIMEZONE);

  for (const schedule of schedules) {
    for (let week = 0; week < weeksAhead; week++) {
      const weekStart = startOfWeek(addWeeks(now, week), { weekStartsOn: 1 });
      const targetDate = setDay(weekStart, schedule.day_of_week, { weekStartsOn: 1 });

      if (targetDate <= now) continue;

      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const key = `${schedule.id}_${dateStr}`;

      if (existingSet.has(key)) continue;

      const sessionDateTime = new Date(`${dateStr}T${schedule.start_time}`);
      const openAt = new Date(sessionDateTime.getTime() - DEFAULT_SETTINGS.registrationOpenHours * 3600000);
      const closeAt = new Date(sessionDateTime.getTime() - DEFAULT_SETTINGS.registrationCloseHours * 3600000);

      sessionsToCreate.push({
        date: dateStr,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        court_name: schedule.court_name,
        recurring_schedule_id: schedule.id,
        status: 'UPCOMING',
        registration_open_at: openAt.toISOString(),
        registration_close_at: closeAt.toISOString(),
        created_by: schedule.created_by,
      });
    }
  }

  if (sessionsToCreate.length > 0) {
    const { error } = await adminClient
      .from('sessions')
      .insert(sessionsToCreate);

    if (error) throw new Error(error.message || 'Failed to generate sessions');
  }

  return sessionsToCreate.length;
}

/**
 * Finalize a session: validate data, create payment records
 */
export async function finalizeSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  const { data: session } = await adminClient
    .from('sessions')
    .select('*, session_costs(*)')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');
  if (session.status === 'FINALIZED') throw new Error('Session already finalized');

  const costs = session.session_costs?.[0] || session.session_costs;
  if (!costs) throw new Error('Session costs not entered');

  const { data: attendees } = await adminClient
    .from('registrations')
    .select('*, profiles:user_id(id, full_name)')
    .eq('session_id', sessionId)
    .eq('status', 'ATTENDED');

  if (!attendees || attendees.length === 0) {
    throw new Error('No attendees found');
  }

  const { calculateSessionCosts, validateCostBreakdown } = await import('@/services/cost-calculation.service');

  const breakdown = calculateSessionCosts({
    courtCost: costs.court_cost,
    shuttlecockCost: costs.shuttlecock_cost,
    otherCost: costs.other_cost,
    calculationMethod: costs.calculation_method,
    attendees: attendees.map((a) => ({
      userId: a.user_id,
      userName: a.profiles?.full_name || '',
      setsPlayed: a.sets_played,
    })),
  });

  const validation = validateCostBreakdown(
    breakdown,
    costs.court_cost,
    costs.shuttlecock_cost,
    costs.other_cost
  );

  if (!validation.valid) {
    throw new Error(`Cost validation failed: ${validation.errors.join(', ')}`);
  }

  const payments = breakdown.map((b) => ({
    session_id: sessionId,
    user_id: b.userId,
    court_share: b.courtShare,
    shuttlecock_share: b.shuttlecockShare,
    other_share: b.otherShare,
    total_amount: b.totalAmount,
    status: 'PENDING' as const,
  }));

  await adminClient
    .from('payments')
    .delete()
    .eq('session_id', sessionId);

  const { error: payError } = await adminClient
    .from('payments')
    .insert(payments);

  if (payError) throw new Error(payError.message || 'Failed to create payments');

  await adminClient
    .from('registrations')
    .update({ status: 'NO_SHOW' })
    .eq('session_id', sessionId)
    .eq('status', 'REGISTERED');

  await adminClient
    .from('sessions')
    .update({ status: 'FINALIZED' })
    .eq('id', sessionId);

  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'SESSION_FINALIZED',
    entity_type: 'session',
    entity_id: sessionId,
    metadata: {
      attendee_count: attendees.length,
      total_cost: costs.court_cost + costs.shuttlecock_cost + costs.other_cost,
    },
  });

  const notifications = breakdown.map((b) => ({
    user_id: b.userId,
    type: 'PAYMENT_REQUEST' as const,
    title: 'Payment Request',
    message: `Your badminton session payment is ${new Intl.NumberFormat('vi-VN').format(b.totalAmount)} ₫`,
    link: '/payments',
  }));

  await adminClient.from('notifications').insert(notifications);

  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath('/admin/payments');
  revalidatePath('/payments');
}

/**
 * Reopen a finalized session (admin only)
 */
export async function reopenSession(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  await adminClient
    .from('sessions')
    .update({ status: 'COMPLETED' })
    .eq('id', sessionId);

  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'SESSION_REOPENED',
    entity_type: 'session',
    entity_id: sessionId,
    metadata: {},
  });

  revalidatePath(`/admin/sessions/${sessionId}`);
}

/**
 * Get sessions within a date range with full details
 */
export async function getSessionsForDateRange(
  dateFrom: string,
  dateTo: string
): Promise<SessionWithDetails[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('sessions')
    .select(`
      *,
      registrations (
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      ),
      session_costs (*)
    `)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .neq('status', 'CANCELLED')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[getSessionsForDateRange] Error:', error);
    return [];
  }

  return (data || []).map(mapSessionWithDetails);
}

/**
 * Add a walk-in player to a session (admin only)
 * Creates a registration with ATTENDED status for an existing user
 */
export async function addWalkInPlayerToSession(
  sessionId: string,
  userId: string,
  setsPlayed: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const adminClient = createAdminClient();

    // Check if registration already exists
    const { data: existing } = await adminClient
      .from('registrations')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing to ATTENDED
      await adminClient
        .from('registrations')
        .update({ status: 'ATTENDED', sets_played: setsPlayed })
        .eq('id', existing.id);
    } else {
      // Create new registration as ATTENDED
      await adminClient
        .from('registrations')
        .insert({
          session_id: sessionId,
          user_id: userId,
          status: 'ATTENDED',
          sets_played: setsPlayed,
          registered_at: new Date().toISOString(),
        });
    }

    revalidatePath(`/admin/sessions/${sessionId}`);
    revalidatePath('/admin/payments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Thêm thất bại' };
  }
}

function mapSessionWithDetails(data: Record<string, unknown>): SessionWithDetails {
  const registrations = (data.registrations as RegistrationWithProfile[]) || [];
  const activeRegistrations = registrations.filter(
    (r) => r.status !== 'CANCELLED'
  );

  return {
    ...(data as unknown as Session),
    registrations,
    session_costs: Array.isArray(data.session_costs)
      ? data.session_costs[0] || null
      : data.session_costs || null,
    registration_count: activeRegistrations.length,
    attended_count: registrations.filter((r) => r.status === 'ATTENDED').length,
  };
}
