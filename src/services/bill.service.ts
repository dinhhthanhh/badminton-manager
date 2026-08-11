'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

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
  } catch (err: any) {
    return { success: false, error: err.message || 'Có lỗi xảy ra khi đăng hóa đơn' };
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
  } catch (err: any) {
    return { success: false, error: err.message || 'Duyệt hóa đơn thất bại' };
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
  } catch (err: any) {
    return { success: false, error: err.message || 'Từ chối thất bại' };
  }
}
