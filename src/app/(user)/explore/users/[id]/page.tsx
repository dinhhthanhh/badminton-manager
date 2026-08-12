import { getPublicUserProfile, getUserStats, getCurrentProfile } from '@/services/user.service';
import { getUserRatingSummary, getCoAttendedSessions } from '@/services/rating.service';
import { notFound, redirect } from 'next/navigation';
import { PublicProfileClient } from '@/components/profile/public-profile-client';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getPublicUserProfile(id);
  return {
    title: user ? `${user.full_name} - Hồ sơ cầu thủ` : 'Hồ sơ người chơi',
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentProfile();
  if (!currentUser) redirect('/login');

  const targetUser = await getPublicUserProfile(id);
  if (!targetUser) notFound();

  const [stats, ratingSummary, coAttendedSessions] = await Promise.all([
    getUserStats(id),
    getUserRatingSummary(id),
    getCoAttendedSessions(currentUser.id, id),
  ]);

  return (
    <PublicProfileClient
      currentUser={currentUser}
      targetUser={targetUser}
      stats={stats}
      ratingSummary={ratingSummary}
      coAttendedSessions={coAttendedSessions}
    />
  );
}
