'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { Club, ClubMember, Profile } from '@/types';

const ACTIVE_CLUB_COOKIE = 'active_club_id';

/**
 * Get active club ID for the current session
 */
export async function getActiveClubId(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(ACTIVE_CLUB_COOKIE)?.value;
  return val || null;
}

/**
 * Set active club ID
 */
export async function setActiveClubId(clubId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}

/**
 * Get user's active club details
 */
export async function getActiveClub(userId: string): Promise<Club | null> {
  const activeId = await getActiveClubId();
  const clubs = await getUserClubs(userId);
  if (clubs.length === 0) return null;

  if (activeId) {
    const found = clubs.find((c) => c.id === activeId);
    if (found) return found;
  }

  // Fallback to first club
  return clubs[0];
}

/**
 * Create a new club (Requires inviting at least 1 member to form a 2-person group)
 */
export async function createClub(input: {
  name: string;
  description?: string;
  invitedUserId: string; // Mandatory 2nd member to form a 2-person club
}): Promise<{ success: boolean; clubId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    if (!input.name.trim()) {
      return { success: false, error: 'Tên câu lạc bộ không được để trống' };
    }

    if (!input.invitedUserId || input.invitedUserId === user.id) {
      return { success: false, error: 'Bạn phải mời ít nhất 1 thành viên khác để tạo nhóm 2 người' };
    }

    const adminClient = createAdminClient();

    // 1. Verify invited user exists
    const { data: invitedUser } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', input.invitedUserId)
      .maybeSingle();

    if (!invitedUser) {
      return { success: false, error: 'Không tìm thấy thành viên được mời' };
    }

    // 2. Insert Club
    const { data: club, error: clubErr } = await adminClient
      .from('clubs')
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || '',
        owner_id: user.id,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (clubErr || !club) {
      return { success: false, error: clubErr?.message || 'Tạo CLB thất bại' };
    }

    // 3. Update creator's role to CLUB_OWNER if currently USER
    const { data: creatorProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (creatorProfile?.role === 'USER') {
      await adminClient
        .from('profiles')
        .update({ role: 'CLUB_OWNER' })
        .eq('id', user.id);
    }

    // 4. Add Creator as OWNER member
    await adminClient.from('club_members').insert({
      club_id: club.id,
      user_id: user.id,
      role: 'OWNER',
      status: 'APPROVED',
    });

    // 5. Add Invited User as PENDING or APPROVED member
    await adminClient.from('club_members').insert({
      club_id: club.id,
      user_id: input.invitedUserId,
      role: 'MEMBER',
      status: 'APPROVED', // auto-approve 2nd founding member
      invited_by: user.id,
    });

    // 6. Notify invited user
    await adminClient.from('notifications').insert({
      user_id: input.invitedUserId,
      type: 'REGISTRATION_CONFIRMED',
      title: `Bạn được mời tham gia CLB ${club.name}`,
      message: `Bạn và ${user.user_metadata?.full_name || 'một thành viên'} đã cùng tạo nên CLB ${club.name}!`,
      link: '/clubs',
    });

    // Set as active club
    await setActiveClubId(club.id);

    revalidatePath('/clubs');
    revalidatePath('/', 'layout');
    return { success: true, clubId: club.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Có lỗi xảy ra' };
  }
}

/**
 * Get all clubs that a user belongs to
 */
export async function getUserClubs(userId: string): Promise<Club[]> {
  try {
    const adminClient = createAdminClient();

    const { data: memberRows, error } = await adminClient
      .from('club_members')
      .select('club_id, status, clubs (*)')
      .eq('user_id', userId)
      .eq('status', 'APPROVED');

    if (error || !memberRows) return [];

    return memberRows
      .map((r) => r.clubs as unknown as Club)
      .filter((c) => c && c.status === 'ACTIVE');
  } catch {
    return [];
  }
}

/**
 * Get details of a club by ID
 */
export async function getClubById(clubId: string): Promise<Club | null> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .maybeSingle();

    return (data || null) as Club | null;
  } catch {
    return null;
  }
}

/**
 * Get members of a club
 */
export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('club_members')
      .select(`
        *,
        profiles:user_id (id, full_name, avatar_url, email, skill_level)
      `)
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as unknown as ClubMember[];
  } catch {
    return [];
  }
}

/**
 * Invite user to an existing club
 */
export async function inviteUserToClub(
  clubId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Check if user is already in club
    const { data: existing } = await adminClient
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Thành viên này đã tham gia hoặc có trong danh sách lời mời' };
    }

    await adminClient.from('club_members').insert({
      club_id: clubId,
      user_id: userId,
      role: 'MEMBER',
      status: 'APPROVED',
      invited_by: user.id,
    });

    revalidatePath(`/clubs/${clubId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi lời mời' };
  }
}

/**
 * Search users to invite (excludes existing club members)
 */
export async function searchUsersToInvite(
  queryStr: string,
  excludeClubId?: string
): Promise<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email' | 'skill_level'>[]> {
  if (!queryStr.trim()) return [];

  try {
    const adminClient = createAdminClient();

    let existingUserIds: string[] = [];
    if (excludeClubId) {
      const { data: existingMembers } = await adminClient
        .from('club_members')
        .select('user_id')
        .eq('club_id', excludeClubId);

      existingUserIds = (existingMembers || []).map((m) => m.user_id);
    }

    let query = adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email, skill_level')
      .or(`full_name.ilike.%${queryStr}%,email.ilike.%${queryStr}%`)
      .limit(10);

    const { data } = await query;
    if (!data) return [];

    return data.filter((u) => !existingUserIds.includes(u.id));
  } catch {
    return [];
  }
}

/**
 * Get all active clubs for public discovery & search
 */
export async function getAllPublicClubs(queryStr?: string): Promise<Club[]> {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from('clubs')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (queryStr && queryStr.trim()) {
      query = query.ilike('name', `%${queryStr.trim()}%`);
    }

    const { data } = await query;
    return (data || []) as Club[];
  } catch {
    return [];
  }
}

/**
 * Submit join request to a club (requires Club Owner approval)
 */
export async function requestToJoinClub(clubId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Fetch user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Fetch club info & owner
    const { data: club } = await adminClient
      .from('clubs')
      .select('id, name, owner_id')
      .eq('id', clubId)
      .single();

    if (!club) return { success: false, error: 'Không tìm thấy câu lạc bộ' };

    // Check existing membership
    const { data: existing } = await adminClient
      .from('club_members')
      .select('id, status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'PENDING') {
        return { success: false, error: 'Yêu cầu tham gia của bạn đang chờ Chủ CLB duyệt' };
      }
      if (existing.status === 'APPROVED') {
        return { success: false, error: 'Bạn đã là thành viên của CLB này rồi' };
      }
    }

    await adminClient.from('club_members').upsert({
      club_id: clubId,
      user_id: user.id,
      role: 'MEMBER',
      status: 'PENDING',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'club_id,user_id' });

    // Send notification to Club Owner
    await adminClient.from('notifications').insert({
      user_id: club.owner_id,
      type: 'REGISTRATION_CONFIRMED',
      title: 'Yêu cầu tham gia CLB mới 📩',
      message: `${profile?.full_name || 'Một thành viên'} đã xin tham gia CLB ${club.name} của bạn.`,
      link: `/clubs/${club.id}`,
    });

    revalidatePath('/clubs');
    revalidatePath(`/clubs/${clubId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Yêu cầu thất bại' };
  }
}

/**
 * Approve member join request (Club Owner or Admin)
 */
export async function approveClubMember(
  clubId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    const { data: club } = await adminClient
      .from('clubs')
      .select('name, owner_id')
      .eq('id', clubId)
      .single();

    if (!club) return { success: false, error: 'CLB không tồn tại' };

    await adminClient
      .from('club_members')
      .update({ status: 'APPROVED', joined_at: new Date().toISOString() })
      .eq('club_id', clubId)
      .eq('user_id', userId);

    // Notify member
    await adminClient.from('notifications').insert({
      user_id: userId,
      type: 'ACCOUNT_APPROVED',
      title: 'Yêu cầu gia nhập CLB đã được duyệt 🎉',
      message: `Chúc mừng! Chủ CLB đã duyệt yêu cầu gia nhập CLB ${club.name} của bạn.`,
      link: `/clubs/${clubId}`,
    });

    revalidatePath(`/clubs/${clubId}`);
    revalidatePath('/clubs');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Duyệt thất bại' };
  }
}

/**
 * Reject member join request
 */
export async function rejectClubMember(
  clubId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    await adminClient
      .from('club_members')
      .update({ status: 'REJECTED' })
      .eq('club_id', clubId)
      .eq('user_id', userId);

    revalidatePath(`/clubs/${clubId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Từ chối thất bại' };
  }
}

/**
 * Get clubs where user has a PENDING join request
 */
export async function getUserPendingClubs(userId: string): Promise<Club[]> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('club_members')
      .select('clubs (*)')
      .eq('user_id', userId)
      .eq('status', 'PENDING');

    return (data || []).map((d) => d.clubs as unknown as Club).filter(Boolean);
  } catch {
    return [];
  }
}
