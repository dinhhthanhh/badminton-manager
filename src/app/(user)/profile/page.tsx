import { getCurrentProfile, getUserStats } from '@/services/user.service';
import { getUpcomingSessions } from '@/services/session.service';
import { getOutstandingTotal } from '@/services/payment.service';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile/profile-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân',
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const [sessions, outstanding, stats] = await Promise.all([
    getUpcomingSessions(20),
    getOutstandingTotal(profile.id),
    getUserStats(profile.id),
  ]);

  const upcomingCount = sessions.filter(
    (s) => s.registrations.some((r) => r.profiles?.id === profile.id && r.status !== 'CANCELLED')
  ).length;

  return (
    <ProfileClient
      profile={profile}
      upcomingCount={upcomingCount}
      outstandingAmount={outstanding}
      attendedCount={stats.attendedSessions}
    />
  );
}
