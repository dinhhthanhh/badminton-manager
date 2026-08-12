'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// ─── Shuttlecock Type ────────────────────────────────────────────────
export interface ShuttlecockType {
  name: string;        // e.g. "Victor AS-30", "Yonex AS-05"
  quantity: number;    // number of shuttlecocks used
  pricePerUnit: number; // VND per shuttlecock
}

// ─── Walk-in Player (not registered but played) ─────────────────────
export interface WalkInPlayer {
  id: string;          // generated client-side
  name: string;
  setsPlayed: number;
}

// ─── Session Cost Detail (extended) ─────────────────────────────────
export interface SessionCostDetail {
  sessionId: string;
  // Court
  courtHourlyRate: number;  // VND per hour
  courtHours: number;       // e.g. 2 hours
  // Shuttlecocks (multiple types)
  shuttlecockTypes: ShuttlecockType[];
  // Water / drinks
  waterCost: number;        // total water cost
  // Walk-in players
  walkInPlayers: WalkInPlayer[];
  // Metadata
  updatedAt?: string;
  updatedBy?: string;
}

// ─── Legacy Court Bill Types (kept for backwards compat) ────────────
export interface CourtBillInput {
  date: string;
  sessionId?: string;
  courtCost: number;
  shuttlecockCost: number;
  otherCost: number;
  notes?: string;
}

export interface CourtBillRecord {
  id: string;
  date: string;
  session_id: string;
  session_info?: string;
  submitted_by: string;
  submitter_name: string;
  submitter_avatar?: string;
  court_cost: number;
  shuttlecock_cost: number;
  other_cost: number;
  total_cost: number;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

/**
 * Save detailed session cost breakdown
 */
export async function saveSessionCostDetails(
  detail: SessionCostDetail
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    const key = `session_cost_details_${detail.sessionId}`;
    const payload: SessionCostDetail = {
      ...detail,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await adminClient.from('app_settings').upsert({
      key,
      value: JSON.stringify(payload),
      updated_by: user.id,
    });

    // Also update the session_costs table with computed totals for finalization
    const courtTotal = detail.courtHourlyRate * detail.courtHours;
    const shuttlecockTotal = detail.shuttlecockTypes.reduce(
      (sum, s) => sum + s.quantity * s.pricePerUnit, 0
    );

    await adminClient.from('session_costs').upsert({
      session_id: detail.sessionId,
      court_cost: courtTotal,
      shuttlecock_cost: shuttlecockTotal,
      other_cost: detail.waterCost,
      calculation_method: 'BY_SET',
    }, { onConflict: 'session_id' });

    revalidatePath('/admin/payments');
    revalidatePath('/payments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi lưu chi phí' };
  }
}

/**
 * Get detailed session cost breakdown
 */
export async function getSessionCostDetails(
  sessionId: string
): Promise<SessionCostDetail | null> {
  try {
    const adminClient = createAdminClient();
    const key = `session_cost_details_${sessionId}`;

    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string'
        ? JSON.parse(data.value)
        : data.value;
      return parsed as SessionCostDetail;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Get cost details for multiple sessions at once
 */
export async function getBatchSessionCostDetails(
  sessionIds: string[]
): Promise<Record<string, SessionCostDetail>> {
  if (sessionIds.length === 0) return {};

  try {
    const adminClient = createAdminClient();
    const keys = sessionIds.map((id) => `session_cost_details_${id}`);

    const { data } = await adminClient
      .from('app_settings')
      .select('key, value')
      .in('key', keys);

    const result: Record<string, SessionCostDetail> = {};
    if (data) {
      for (const row of data) {
        const sessionId = row.key.replace('session_cost_details_', '');
        const parsed = typeof row.value === 'string'
          ? JSON.parse(row.value)
          : row.value;
        result[sessionId] = parsed as SessionCostDetail;
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Legacy Court Bill Functions (preserved) ────────────────────────

/**
 * Submit court bill by member
 */
export async function submitCourtBill(input: CourtBillInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // 1. Fetch user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Không tìm thấy tài khoản' };

    // 2. SYSTEM VERIFICATION: Must verify that a valid session exists on that date/sessionId!
    let sessionQuery = adminClient.from('sessions').select('id, date, start_time, end_time, court_name');
    if (input.sessionId) {
      sessionQuery = sessionQuery.eq('id', input.sessionId);
    } else {
      sessionQuery = sessionQuery.eq('date', input.date);
    }

    const { data: matchingSessions, error: sessionErr } = await sessionQuery;

    if (sessionErr || !matchingSessions || matchingSessions.length === 0) {
      return {
        success: false,
        error: `❌ Hệ thống xác thực thất bại: Không tìm thấy buổi đánh cầu nào vào ngày ${input.date}! Bạn chỉ có thể đăng hóa đơn tiền sân cho buổi tập hợp lệ.`,
      };
    }

    const targetSession = matchingSessions[0];
    const totalCost = (input.courtCost || 0) + (input.shuttlecockCost || 0) + (input.otherCost || 0);

    if (totalCost <= 0) {
      return { success: false, error: 'Tổng chi phí phải lớn hơn 0 ₫' };
    }

    // 3. Store bill in app_settings JSON store (court_bills_data)
    const { data: existingSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'court_bills_data')
      .maybeSingle();

    let billsList: CourtBillRecord[] = [];
    if (existingSetting?.value) {
      try {
        billsList = typeof existingSetting.value === 'string' ? JSON.parse(existingSetting.value) : existingSetting.value;
      } catch {
        billsList = [];
      }
    }

    const newBill: CourtBillRecord = {
      id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: targetSession.date,
      session_id: targetSession.id,
      session_info: `${targetSession.court_name} (${targetSession.start_time.slice(0, 5)} - ${targetSession.end_time.slice(0, 5)})`,
      submitted_by: user.id,
      submitter_name: profile.full_name,
      submitter_avatar: profile.avatar_url || '',
      court_cost: input.courtCost || 0,
      shuttlecock_cost: input.shuttlecockCost || 0,
      other_cost: input.otherCost || 0,
      total_cost: totalCost,
      notes: input.notes || '',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    billsList.unshift(newBill);

    await adminClient.from('app_settings').upsert({
      key: 'court_bills_data',
      value: JSON.stringify(billsList),
      updated_by: user.id,
    });

    revalidatePath('/payments');
    revalidatePath('/admin/payments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng hóa đơn' };
  }
}

/**
 * Get all submitted court bills
 */
export async function getCourtBills(): Promise<CourtBillRecord[]> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'court_bills_data')
      .maybeSingle();

    if (data?.value) {
      let bills = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return Array.isArray(bills) ? bills : [];
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * Admin approves court bill
 */
export async function approveCourtBill(billId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();
    const bills = await getCourtBills();

    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill) return { success: false, error: 'Không tìm thấy hóa đơn' };

    targetBill.status = 'APPROVED';

    await adminClient.from('app_settings').upsert({
      key: 'court_bills_data',
      value: JSON.stringify(bills),
      updated_by: user.id,
    });

    revalidatePath('/payments');
    revalidatePath('/admin/payments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Duyệt hóa đơn thất bại' };
  }
}

/**
 * Admin rejects court bill
 */
export async function rejectCourtBill(billId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();
    const bills = await getCourtBills();

    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill) return { success: false, error: 'Không tìm thấy hóa đơn' };

    targetBill.status = 'REJECTED';

    await adminClient.from('app_settings').upsert({
      key: 'court_bills_data',
      value: JSON.stringify(bills),
      updated_by: user.id,
    });

    revalidatePath('/payments');
    revalidatePath('/admin/payments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Từ chối thất bại' };
  }
}
