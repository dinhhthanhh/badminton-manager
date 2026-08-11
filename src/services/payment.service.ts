'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { PaymentWithDetails } from '@/types';

/**
 * Get user's payments
 */
export async function getUserPayments(
  userId: string,
  status?: string
): Promise<PaymentWithDetails[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('payments')
    .select(`
      *,
      profiles:user_id (id, full_name, avatar_url, email),
      sessions:session_id (id, date, start_time, end_time, court_name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getUserPayments] Error:', error);
    return [];
  }
  return (data || []) as unknown as PaymentWithDetails[];
}

/**
 * Get all payments for admin
 */
export async function getAllPayments(
  status?: string
): Promise<PaymentWithDetails[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('payments')
    .select(`
      *,
      profiles:user_id (id, full_name, avatar_url, email),
      sessions:session_id (id, date, start_time, end_time, court_name)
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getAllPayments] Error:', error);
    return [];
  }
  return (data || []) as unknown as PaymentWithDetails[];
}

/**
 * Mark payment as paid (user action)
 */
export async function markPaymentAsPaid(
  paymentId: string,
  proofUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const adminClient = createAdminClient();

  const { data: payment } = await adminClient
    .from('payments')
    .select('user_id, status')
    .eq('id', paymentId)
    .single();

  if (!payment) return { success: false, error: 'Payment not found' };
  if (payment.user_id !== user.id) return { success: false, error: 'Not authorized' };
  if (payment.status !== 'PENDING') return { success: false, error: 'Payment cannot be updated' };

  const updateData: Record<string, unknown> = {
    status: 'PAID',
    paid_at: new Date().toISOString(),
  };

  if (proofUrl) {
    updateData.proof_url = proofUrl;
  }

  const { error } = await adminClient
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/payments');
  return { success: true };
}

/**
 * Verify payment (admin action)
 */
export async function verifyPayment(paymentId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('payments')
    .update({
      status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq('id', paymentId);

  if (error) throw new Error(error.message || 'Failed to verify payment');

  const { data: payment } = await adminClient
    .from('payments')
    .select('user_id, total_amount')
    .eq('id', paymentId)
    .single();

  if (payment) {
    await adminClient.from('notifications').insert({
      user_id: payment.user_id,
      type: 'PAYMENT_VERIFIED',
      title: 'Payment Verified',
      message: `Your payment of ${new Intl.NumberFormat('vi-VN').format(payment.total_amount)} ₫ has been verified.`,
      link: '/payments',
    });
  }

  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'PAYMENT_VERIFIED',
    entity_type: 'payment',
    entity_id: paymentId,
    metadata: {},
  });

  revalidatePath('/admin/payments');
}

/**
 * Reject payment (admin action)
 */
export async function rejectPayment(paymentId: string, reason?: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('payments')
    .update({
      status: 'REJECTED',
      notes: reason || 'Payment rejected by admin',
    })
    .eq('id', paymentId);

  if (error) throw new Error(error.message || 'Failed to reject payment');

  revalidatePath('/admin/payments');
}

/**
 * Get outstanding payment total for a user
 */
export async function getOutstandingTotal(userId: string): Promise<number> {
  try {
    const adminClient = createAdminClient();

    const { data } = await adminClient
      .from('payments')
      .select('total_amount')
      .eq('user_id', userId)
      .eq('status', 'PENDING');

    return (data || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Upload payment proof
 */
export async function uploadPaymentProof(
  paymentId: string,
  file: File
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${paymentId}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(fileName, file, { upsert: true });

  if (error) throw new Error(error.message || 'Failed to upload proof');

  return data.path;
}
