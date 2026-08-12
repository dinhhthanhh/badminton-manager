'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Rating, Session } from '@/types';

export interface RatingInput {
  targetUserId: string;
  sessionId: string;
  proofNote?: string;
  stars: number;
  comment?: string;
  categories?: {
    punctuality?: number;
    payment?: number;
    sportsmanship?: number;
  };
}

export interface CoAttendedSession {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  courtName: string;
  clubId?: string;
  clubName?: string;
}

export interface UserRatingSummary {
  averageStars: number;
  totalRatings: number;
  verifiedRatingsCount: number;
  pendingRatingsCount: number;
  reliabilityScore: number; // 0 to 100%
  reliabilityLabel: string;
  categories: {
    punctuality: number;
    payment: number;
    sportsmanship: number;
  };
  ratings: Rating[];
}

/**
 * Helper to get all ratings from app_settings fallback store
 */
async function getAllRatingsFromStore(): Promise<Rating[]> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'ratings_store_v2')
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * Save ratings array to app_settings store
 */
async function saveAllRatingsToStore(ratings: Rating[]): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient.from('app_settings').upsert({
    key: 'ratings_store_v2',
    value: JSON.stringify(ratings),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Get sessions that BOTH rater and target user attended together
 */
export async function getCoAttendedSessions(
  raterId: string,
  targetUserId: string
): Promise<CoAttendedSession[]> {
  try {
    const adminClient = createAdminClient();

    // Find registrations for target user marked ATTENDED or REGISTERED
    const { data: targetRegs } = await adminClient
      .from('registrations')
      .select('session_id, sessions (*)')
      .eq('user_id', targetUserId)
      .neq('status', 'CANCELLED');

    if (!targetRegs || targetRegs.length === 0) return [];

    const sessionIds = targetRegs.map((r) => r.session_id);

    // Check if rater also has a registration in those same sessionIds
    const { data: raterRegs } = await adminClient
      .from('registrations')
      .select('session_id')
      .eq('user_id', raterId)
      .in('session_id', sessionIds)
      .neq('status', 'CANCELLED');

    const raterSessionIds = new Set((raterRegs || []).map((r) => r.session_id));

    const result: CoAttendedSession[] = [];

    for (const tr of targetRegs) {
      if (raterSessionIds.has(tr.session_id) && tr.sessions) {
        const s = tr.sessions as unknown as Session;
        result.push({
          sessionId: s.id,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          courtName: s.court_name,
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Submit a rating for a co-player with session proof & requirement for Club Owner confirmation
 */
export async function rateUserWithSessionProof(
  input: RatingInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    if (user.id === input.targetUserId) {
      return { success: false, error: 'Bạn không thể tự đánh giá chính mình' };
    }

    if (!input.sessionId) {
      return { success: false, error: 'Vui lòng chọn buổi tập mà hai bạn đã cùng tham gia' };
    }

    if (input.stars < 1 || input.stars > 5) {
      return { success: false, error: 'Số sao đánh giá phải từ 1 đến 5' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch rater profile
    const { data: raterProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // 2. Fetch target user profile
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', input.targetUserId)
      .single();

    // 3. Fetch session info & verify both players attended this session
    const { data: session } = await adminClient
      .from('sessions')
      .select('id, date, start_time, end_time, court_name, club_id')
      .eq('id', input.sessionId)
      .single();

    if (!session) {
      return { success: false, error: 'Không tìm thấy thông tin buổi đánh này' };
    }

    // Verify co-attendance in database
    const { data: coRegs } = await adminClient
      .from('registrations')
      .select('user_id')
      .eq('session_id', input.sessionId)
      .in('user_id', [user.id, input.targetUserId])
      .neq('status', 'CANCELLED');

    const participantUserIds = (coRegs || []).map((r) => r.user_id);
    const raterAttended = participantUserIds.includes(user.id);
    const targetAttended = participantUserIds.includes(input.targetUserId);

    if (!raterAttended || !targetAttended) {
      return {
        success: false,
        error: `❌ Không thể đánh giá: Bạn và ${targetProfile?.full_name || 'người chơi này'} không cùng tham gia buổi tập ngày ${session.date}!`,
      };
    }

    // Determine club owner for confirmation
    let clubOwnerId: string | null = null;
    let clubName = 'Câu Lạc Bộ';

    if (session.club_id) {
      const { data: club } = await adminClient
        .from('clubs')
        .select('name, owner_id')
        .eq('id', session.club_id)
        .single();

      if (club) {
        clubOwnerId = club.owner_id;
        clubName = club.name;
      }
    }

    // Fallback: If no club owner found, find system admin to verify
    if (!clubOwnerId) {
      const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'ADMIN')
        .limit(1);
      if (admins && admins.length > 0) clubOwnerId = admins[0].id;
    }

    // Build new Rating record
    const ratingRecord: Rating = {
      id: `rat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rater_id: user.id,
      rated_user_id: input.targetUserId,
      session_id: input.sessionId,
      club_id: session.club_id || null,
      stars: input.stars,
      comment: input.comment?.trim() || '',
      proof_note: input.proofNote?.trim() || `Cùng tham gia buổi đánh ngày ${session.date}`,
      status: 'PENDING_APPROVAL', // Must be confirmed by Club Owner!
      categories: input.categories || { punctuality: input.stars, payment: input.stars, sportsmanship: input.stars },
      created_at: new Date().toISOString(),
      rater: {
        id: raterProfile?.id || user.id,
        full_name: raterProfile?.full_name || 'Cầu thủ',
        avatar_url: raterProfile?.avatar_url || null,
      },
      session: {
        id: session.id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        court_name: session.court_name,
      },
      club: {
        id: session.club_id || '',
        name: clubName,
      },
    };

    // Store in app_settings store
    const store = await getAllRatingsFromStore();
    // Replace any previous pending rating for same rater/target/session
    const filtered = store.filter(
      (r) => !(r.rater_id === user.id && r.rated_user_id === input.targetUserId && r.session_id === input.sessionId)
    );
    filtered.unshift(ratingRecord);
    await saveAllRatingsToStore(filtered);

    // Send notification to Club Owner / Verifier
    if (clubOwnerId) {
      await adminClient.from('notifications').insert({
        user_id: clubOwnerId,
        type: 'REGISTRATION_CONFIRMED',
        title: 'Yêu cầu xác nhận đánh giá uy tín ⭐',
        message: `${raterProfile?.full_name || 'Cầu thủ'} đã gửi đánh giá cho ${targetProfile?.full_name || 'thành viên'} vào buổi đánh ngày ${session.date}. Vui lòng xác nhận minh chứng!`,
        link: session.club_id ? `/clubs/${session.club_id}` : '/admin/dashboard',
      });
    }

    revalidatePath(`/explore/users/${input.targetUserId}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Có lỗi xảy ra' };
  }
}

/**
 * Get pending ratings for a Club Owner to review and verify
 */
export async function getPendingClubRatings(clubId?: string): Promise<Rating[]> {
  try {
    const store = await getAllRatingsFromStore();
    return store.filter(
      (r) => r.status === 'PENDING_APPROVAL' && (!clubId || r.club_id === clubId || !r.club_id)
    );
  } catch {
    return [];
  }
}

/**
 * Club Owner / Admin verifies and confirms a rating
 */
export async function confirmRatingByOwner(
  ratingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const store = await getAllRatingsFromStore();
    const target = store.find((r) => r.id === ratingId);

    if (!target) return { success: false, error: 'Không tìm thấy bài đánh giá' };

    target.status = 'VERIFIED';
    target.verified_at = new Date().toISOString();
    await saveAllRatingsToStore(store);

    const adminClient = createAdminClient();
    // Notify rater and rated user
    await adminClient.from('notifications').insert({
      user_id: target.rated_user_id,
      type: 'ACCOUNT_APPROVED',
      title: 'Đánh giá uy tín đã được Chủ CLB xác nhận! 🌟',
      message: 'Đánh giá uy tín của bạn đã được kiểm duyệt và cộng vào Điểm Uy Tín chính thức.',
      link: `/explore/users/${target.rated_user_id}`,
    });

    revalidatePath(`/explore/users/${target.rated_user_id}`);
    revalidatePath('/clubs');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Duyệt thất bại' };
  }
}

/**
 * Club Owner / Admin rejects a rating (fake or inaccurate)
 */
export async function rejectRatingByOwner(
  ratingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const store = await getAllRatingsFromStore();
    const target = store.find((r) => r.id === ratingId);

    if (!target) return { success: false, error: 'Không tìm thấy bài đánh giá' };

    target.status = 'REJECTED';
    await saveAllRatingsToStore(store);

    revalidatePath(`/explore/users/${target.rated_user_id}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Từ chối thất bại' };
  }
}

/**
 * Get ratings & reliability score summary for a user.
 * ONLY VERIFIED RATINGS count towards official rating & reliability score!
 */
export async function getUserRatingSummary(userId: string): Promise<UserRatingSummary> {
  const adminClient = createAdminClient();

  const store = await getAllRatingsFromStore();
  const allUserRatings = store.filter((r) => r.rated_user_id === userId);

  // Only verified ratings affect official score
  const verifiedRatings = allUserRatings.filter((r) => r.status === 'VERIFIED');
  const pendingRatings = allUserRatings.filter((r) => r.status === 'PENDING_APPROVAL');

  const totalRatings = allUserRatings.length;
  const verifiedCount = verifiedRatings.length;

  let averageStars = 5.0;
  let avgPunctuality = 5.0;
  let avgPayment = 5.0;
  let avgSportsmanship = 5.0;

  if (verifiedCount > 0) {
    const sumStars = verifiedRatings.reduce((s, r) => s + r.stars, 0);
    averageStars = Math.round((sumStars / verifiedCount) * 10) / 10;

    let pCount = 0, pSum = 0;
    let payCount = 0, paySum = 0;
    let sCount = 0, sSum = 0;

    for (const r of verifiedRatings) {
      if (r.categories?.punctuality) { pSum += r.categories.punctuality; pCount++; }
      if (r.categories?.payment) { paySum += r.categories.payment; payCount++; }
      if (r.categories?.sportsmanship) { sSum += r.categories.sportsmanship; sCount++; }
    }

    avgPunctuality = pCount > 0 ? Math.round((pSum / pCount) * 10) / 10 : averageStars;
    avgPayment = payCount > 0 ? Math.round((paySum / payCount) * 10) / 10 : averageStars;
    avgSportsmanship = sCount > 0 ? Math.round((sSum / sCount) * 10) / 10 : averageStars;
  }

  // Attendance stats for Reliability Score calculation
  const { data: registrations } = await adminClient
    .from('registrations')
    .select('status')
    .eq('user_id', userId);

  const totalRegs = (registrations || []).length;
  const noShowCount = (registrations || []).filter(
    (r) => r.status === 'NO_SHOW' || r.status === 'ABSENT'
  ).length;

  const noShowRate = totalRegs > 0 ? noShowCount / totalRegs : 0;

  // Unpaid pending payments
  const { data: pendingPayments } = await adminClient
    .from('payments')
    .select('id, total_amount')
    .eq('user_id', userId)
    .eq('status', 'PENDING');

  const pendingCount = (pendingPayments || []).length;

  // Calculate official Reliability Score (0 to 100%)
  let score = 100;
  score -= Math.min(40, noShowRate * 100 * 0.8);
  score -= Math.min(30, pendingCount * 10);
  if (verifiedCount > 0) {
    score += (averageStars - 4) * 10;
  }

  score = Math.max(10, Math.min(100, Math.round(score)));

  let reliabilityLabel = 'Cần chú ý ⚠️';
  if (score >= 85) reliabilityLabel = 'Rất uy tín 🌟';
  else if (score >= 70) reliabilityLabel = 'Uy tín khá 👍';
  else if (score >= 50) reliabilityLabel = 'Trung bình ⚖️';

  return {
    averageStars,
    totalRatings,
    verifiedRatingsCount: verifiedCount,
    pendingRatingsCount: pendingRatings.length,
    reliabilityScore: score,
    reliabilityLabel,
    categories: {
      punctuality: avgPunctuality,
      payment: avgPayment,
      sportsmanship: avgSportsmanship,
    },
    ratings: allUserRatings,
  };
}
