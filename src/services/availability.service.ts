'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { AvailabilitySlotWithProfile } from '@/types';

/**
 * Get all member availability slots for a specific date
 */
export async function getAvailabilitySlotsForDate(
  dateStr: string
): Promise<AvailabilitySlotWithProfile[]> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('availability_slots')
      .select(`
        *,
        profiles:user_id (id, full_name, avatar_url, email)
      `)
      .eq('date', dateStr)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[getAvailabilitySlotsForDate] Error:', error);
      return [];
    }
    return (data || []) as unknown as AvailabilitySlotWithProfile[];
  } catch (e) {
    console.error('[getAvailabilitySlotsForDate] Exception:', e);
    return [];
  }
}

/**
 * Get summary of availability slots per date for a range including profiles
 */
export async function getAvailabilitySummary(dateFrom: string, dateTo: string) {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('availability_slots')
      .select(`
        date,
        user_id,
        profiles:user_id (id, full_name, avatar_url, email)
      `)
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (error) return {};

    const summary: Record<string, {
      totalVotes: number;
      uniqueUsers: number;
      registrations: any[];
    }> = {};

    (data || []).forEach((row: any) => {
      if (!summary[row.date]) {
        summary[row.date] = { totalVotes: 0, uniqueUsers: 0, registrations: [] };
      }
      summary[row.date].totalVotes += 1;

      // Add profile if not already present for this date
      const alreadyHas = summary[row.date].registrations.some((r) => r.user_id === row.user_id);
      if (!alreadyHas && row.profiles) {
        summary[row.date].registrations.push({
          id: row.user_id,
          session_id: '',
          user_id: row.user_id,
          status: 'REGISTERED' as const,
          registered_at: '',
          cancelled_at: null,
          cancellation_reason: null,
          cancellation_type: null,
          sets_played: 0,
          created_at: '',
          updated_at: '',
          profiles: row.profiles,
        });
      }
    });

    Object.keys(summary).forEach((date) => {
      summary[date].uniqueUsers = summary[date].registrations.length;
    });

    return summary;
  } catch {
    return {};
  }
}

/**
 * Toggle a 1-hour availability slot for the current user
 */
export async function toggleAvailabilitySlot(
  dateStr: string,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; added: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, added: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Check if slot already exists
    const { data: existing } = await adminClient
      .from('availability_slots')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .eq('start_time', startTime)
      .maybeSingle();

    if (existing) {
      // Remove slot
      await adminClient
        .from('availability_slots')
        .delete()
        .eq('id', existing.id);

      revalidatePath('/dashboard');
      revalidatePath('/schedule');
      return { success: true, added: false };
    } else {
      // Add slot
      const { error } = await adminClient
        .from('availability_slots')
        .insert({
          user_id: user.id,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
        });

      if (error) return { success: false, added: false, error: error.message };

      revalidatePath('/dashboard');
      revalidatePath('/schedule');
      return { success: true, added: true };
    }
  } catch (e: any) {
    return { success: false, added: false, error: e.message || 'Thất bại' };
  }
}

/**
 * Admin action: Confirm court booking & announce to members
 * Automatically notifies all members who selected availability slots on that date!
 */
export async function confirmCourtBooking(input: {
  date: string;
  startTime: string;
  endTime: string;
  courtName: string;
  sessionId?: string;
  notes?: string;
}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Check admin role
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'ADMIN') {
      return { success: false, error: 'Chỉ Admin mới có quyền đặt sân và thông báo' };
    }

    const openAt = new Date().toISOString();
    const closeAt = new Date(`${input.date}T${input.startTime}`).toISOString();
    let targetSessionId = input.sessionId;
    let isUpdate = false;

    if (targetSessionId) {
      // Edit specific existing session
      isUpdate = true;
      const { error: updateErr } = await adminClient
        .from('sessions')
        .update({
          start_time: input.startTime,
          end_time: input.endTime,
          court_name: input.courtName,
          notes: input.notes || null,
          registration_close_at: closeAt,
        })
        .eq('id', targetSessionId);

      if (updateErr) {
        return { success: false, error: updateErr.message || 'Cập nhật sân thất bại' };
      }
    } else {
      // Create new session for this date
      const { data: session, error: sessionErr } = await adminClient
        .from('sessions')
        .insert({
          date: input.date,
          start_time: input.startTime,
          end_time: input.endTime,
          court_name: input.courtName,
          notes: input.notes || null,
          status: 'UPCOMING',
          registration_open_at: openAt,
          registration_close_at: closeAt,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (sessionErr || !session) {
        return { success: false, error: sessionErr?.message || 'Tạo buổi tập thất bại' };
      }
      targetSessionId = session.id;
    }

    // 2. Find all members who registered availability slots for this date
    const { data: slots } = await adminClient
      .from('availability_slots')
      .select('user_id, profiles:user_id (id, email, full_name)')
      .eq('date', input.date);

    const memberMap = new Map<string, { email: string; full_name: string }>();
    (slots || []).forEach((s: any) => {
      if (s.profiles && s.profiles.email) {
        memberMap.set(s.user_id, {
          email: s.profiles.email,
          full_name: s.profiles.full_name || 'Thành viên',
        });
      }
    });

    const memberIds = Array.from(memberMap.keys());

    // 3. Auto-register interested members into registrations table
    if (memberIds.length > 0 && targetSessionId) {
      const regInserts = memberIds.map((memberId) => ({
        session_id: targetSessionId,
        user_id: memberId,
        status: 'REGISTERED' as const,
      }));

      await adminClient
        .from('registrations')
        .upsert(regInserts, { onConflict: 'session_id,user_id' });

      // 4. Send instant in-app notifications
      const formattedDate = new Date(input.date).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const notifInserts = memberIds.map((memberId) => ({
        user_id: memberId,
        type: 'REGISTRATION_CONFIRMED' as const,
        title: isUpdate ? '📝 Đã cập nhật thông tin sân' : '🏸 Đã đặt sân thành công!',
        message: `Admin đã ${isUpdate ? 'cập nhật' : 'chốt đặt'} sân tại ${input.courtName} (${input.startTime.slice(0, 5)} - ${input.endTime.slice(0, 5)}) ngày ${formattedDate}. Lịch đã cập nhật!`,
        link: `/schedule`,
      }));

      await adminClient.from('notifications').insert(notifInserts);

      // 5. Send Gmail / Resend Email notifications in background
      const { sendCourtBookingNotificationEmail } = await import('@/services/email.service');
      for (const [mId, mInfo] of memberMap.entries()) {
        sendCourtBookingNotificationEmail(
          mInfo.email,
          mInfo.full_name,
          input.courtName,
          input.date,
          input.startTime,
          input.endTime,
          isUpdate
        ).catch((err) => console.error('[Email Notification Error]', err));
      }
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'CONFIRM_COURT_BOOKING',
      details: { date: input.date, courtName: input.courtName, sessionId: targetSessionId, isUpdate },
    });

    revalidatePath('/dashboard');
    revalidatePath('/schedule');
    return { success: true, sessionId: targetSessionId };
  } catch (e: any) {
    return { success: false, error: e.message || 'Thất bại' };
  }
}

/**
 * Admin action: Delete court booking session
 */
export async function deleteCourtBooking(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Delete session (cascade deletes registrations)
    const { error } = await adminClient
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard');
    revalidatePath('/schedule');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Xóa thất bại' };
  }
}
