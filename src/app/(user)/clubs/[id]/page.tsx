import { getClubById, getClubMembers } from '@/services/club.service';
import { getCurrentProfile } from '@/services/user.service';
import { getPendingClubRatings } from '@/services/rating.service';
import { notFound, redirect } from 'next/navigation';
import { ClubDetailClient } from '@/components/clubs/club-detail-client';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const club = await getClubById(id);
  return {
    title: club ? `CLB ${club.name}` : 'Chi tiết Câu Lạc Bộ',
  };
}

export default async function ClubDetailPage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentProfile();
  if (!currentUser) redirect('/login');

  const club = await getClubById(id);
  if (!club) notFound();

  const [members, pendingRatings] = await Promise.all([
    getClubMembers(id),
    getPendingClubRatings(id),
  ]);

  return (
    <ClubDetailClient
      club={club}
      members={members}
      pendingRatings={pendingRatings}
      currentUserId={currentUser.id}
    />
  );
}
