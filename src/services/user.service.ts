'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/types';

/**
 * Helper to fetch extended profile fields stored in app_settings fallback
 */
async function getProfileExtension(userId: string): Promise<Partial<Profile>> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', `user_profile_ext_${userId}`)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return parsed as Partial<Profile>;
    }
  } catch {
    // fallback
  }
  return {};
}

/**
 * Get the current user's profile.
 * Auto-creates profile if user exists in auth but profile is missing.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  let { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // If user exists in auth.users but has no profile row, auto-create it now
  if (!profile) {
    const meta = user.user_metadata || {};
    const { data: newProfile, error } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
        avatar_url: meta.avatar_url || meta.picture || null,
        role: 'USER',
        status: 'PENDING',
      })
      .select('*')
      .single();

    if (!error && newProfile) {
      profile = newProfile;
    }
  }

  if (!profile) return null;

  // Merge with app_settings fallback for extended fields if missing
  const ext = await getProfileExtension(user.id);
  return {
    ...profile,
    skill_level: profile.skill_level || ext.skill_level || 'INTERMEDIATE',
    play_frequency: profile.play_frequency || ext.play_frequency || '',
    preferred_time_slots: profile.preferred_time_slots || ext.preferred_time_slots || [],
    bio: profile.bio || ext.bio || '',
  } as Profile;
}

/**
 * Resend approval request to admins (when > 24 hours pending)
 */
export async function resendApprovalRequest(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Không tìm thấy tài khoản' };
    if (profile.status === 'APPROVED') return { success: false, error: 'Tài khoản đã được duyệt' };

    const nowIso = new Date().toISOString();
    await adminClient
      .from('profiles')
      .update({
        status: 'PENDING',
        created_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', user.id);

    const { sendAdminNewMemberPendingEmail } = await import('./email.service');
    const { data: admins } = await adminClient.from('profiles').select('email').eq('role', 'ADMIN');
    const adminEmails = (admins || []).map((a) => a.email).filter(Boolean);

    for (const adminEmail of adminEmails) {
      await sendAdminNewMemberPendingEmail(adminEmail, profile.full_name, profile.email, true);
    }

    revalidatePath('/pending');
    revalidatePath('/blocked');
    revalidatePath('/admin/members');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Gửi yêu cầu thất bại' };
  }
}

/**
 * Update current user's profile
 */
export async function updateUserProfile(
  fullName: string,
  extra?: {
    skillLevel?: string;
    playFrequency?: string;
    preferredTimeSlots?: string[];
    bio?: string;
  }
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');

  if (!fullName.trim()) {
    throw new Error('Tên hiển thị không được để trống');
  }

  const adminClient = createAdminClient();

  // Save extended fields in app_settings fallback first to guarantee persistence
  const extData = {
    skill_level: extra?.skillLevel || 'INTERMEDIATE',
    play_frequency: extra?.playFrequency || '',
    preferred_time_slots: extra?.preferredTimeSlots || [],
    bio: extra?.bio || '',
  };

  await adminClient.from('app_settings').upsert({
    key: `user_profile_ext_${user.id}`,
    value: JSON.stringify(extData),
    updated_by: user.id,
  });

  // Try updating profiles table directly (handling cases where new columns exist or don't exist yet)
  const updatePayload: Record<string, unknown> = {
    full_name: fullName.trim(),
  };

  if (extra?.skillLevel) updatePayload.skill_level = extra.skillLevel;
  if (extra?.playFrequency !== undefined) updatePayload.play_frequency = extra.playFrequency;
  if (extra?.preferredTimeSlots) updatePayload.preferred_time_slots = extra.preferredTimeSlots;
  if (extra?.bio !== undefined) updatePayload.bio = extra.bio;

  const { error } = await adminClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    // Fallback: update only full_name on profiles table if new columns are not in schema cache
    await adminClient
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
}

/**
 * Get public profile of any user
 */
export async function getPublicUserProfile(targetUserId: string): Promise<Profile | null> {
  try {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!profile) return null;

    const ext = await getProfileExtension(targetUserId);

    return {
      ...profile,
      skill_level: profile.skill_level || ext.skill_level || 'INTERMEDIATE',
      play_frequency: profile.play_frequency || ext.play_frequency || '',
      preferred_time_slots: profile.preferred_time_slots || ext.preferred_time_slots || [],
      bio: profile.bio || ext.bio || '',
    } as Profile;
  } catch {
    return null;
  }
}

/**
 * Get all profiles (admin only)
 */
export async function getAllProfiles(
  status?: string,
  search?: string
): Promise<Profile[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getAllProfiles] Error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get pending profiles count (admin only)
 */
export async function getPendingProfilesCount(): Promise<number> {
  try {
    const adminClient = createAdminClient();
    const { count, error } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Update a user's status (admin only)
 */
export async function updateUserStatus(
  userId: string,
  status: 'APPROVED' | 'REJECTED' | 'BLOCKED'
): Promise<void> {
  const supabase = await createClient();

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const { data: targetProfile, error } = await adminClient
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select('email, full_name')
    .single();

  if (error || !targetProfile) throw new Error(error?.message || 'Failed to update status');

  // Create audit log
  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: `USER_${status}`,
    entity_type: 'profile',
    entity_id: userId,
    metadata: { new_status: status },
  });

  // Create in-app notification for the user
  const notifTitle = status === 'APPROVED'
    ? 'Tài khoản đã được duyệt 🎉'
    : status === 'REJECTED'
    ? 'Tài khoản đã bị từ chối ❌'
    : 'Tài khoản đã bị khóa ⛔';

  const notifMessage = status === 'APPROVED'
    ? 'Tài khoản của bạn đã được Admin duyệt! Bây giờ bạn đã có thể đăng ký tham gia các buổi tập.'
    : status === 'REJECTED'
    ? 'Yêu cầu tham gia của bạn đã bị từ chối.'
    : 'Tài khoản của bạn đã bị khóa bởi Admin.';

  await adminClient.from('notifications').insert({
    user_id: userId,
    type: status === 'APPROVED' ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
    title: notifTitle,
    message: notifMessage,
    link: status === 'APPROVED' ? '/dashboard' : '/blocked',
  });

  // Send Email Notification via Resend API
  try {
    const { sendAccountApprovedEmail, sendAccountRejectedEmail } = await import('./email.service');
    if (status === 'APPROVED') {
      await sendAccountApprovedEmail(targetProfile.email, targetProfile.full_name);
    } else if (status === 'REJECTED' || status === 'BLOCKED') {
      await sendAccountRejectedEmail(targetProfile.email, targetProfile.full_name);
    }
  } catch (err) {
    console.error('[updateUserStatus] Failed to send email:', err);
  }

  revalidatePath('/admin/members');
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: 'USER' | 'ADMIN'
): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminClient = createAdminClient();

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw new Error(error.message || 'Failed to update role');

  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'ROLE_CHANGED',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { new_role: role },
  });

  revalidatePath('/admin/members');
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string) {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('status, sets_played')
    .eq('user_id', userId);

  const { data: payments } = await supabase
    .from('payments')
    .select('total_amount, status')
    .eq('user_id', userId);

  const regs = registrations || [];
  const pays = payments || [];

  const attended = regs.filter((r) => r.status === 'ATTENDED');
  const cancelled = regs.filter((r) => r.status === 'CANCELLED');
  const noShow = regs.filter((r) => r.status === 'NO_SHOW' || r.status === 'ABSENT');

  const totalSpent = pays
    .filter((p) => p.status === 'VERIFIED' || p.status === 'PAID')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const outstanding = pays
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  return {
    totalSessions: regs.length,
    attendedSessions: attended.length,
    cancelledSessions: cancelled.length,
    noShowSessions: noShow.length,
    totalSetsPlayed: attended.reduce((sum, r) => sum + (r.sets_played || 0), 0),
    totalMoneySpent: totalSpent,
    outstandingMoney: outstanding,
    averageSessionsPerMonth: 0,
  };
}
