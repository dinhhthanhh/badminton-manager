import { getUserClubs, getActiveClubId, getAllPublicClubs, getUserPendingClubs } from '@/services/club.service';
import { getCurrentProfile } from '@/services/user.service';
import { redirect } from 'next/navigation';
import { ClubsListClient } from '@/components/clubs/clubs-list-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Câu lạc bộ của tôi & Khám phá CLB',
};

export default async function ClubsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const [clubs, activeClubId, publicClubs, pendingClubs] = await Promise.all([
    getUserClubs(profile.id),
    getActiveClubId(),
    getAllPublicClubs(),
    getUserPendingClubs(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Câu lạc bộ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý các CLB bạn tham gia, đăng ký xin gia nhập CLB khác hoặc tự tạo CLB của riêng bạn
        </p>
      </div>

      <ClubsListClient
        clubs={clubs}
        publicClubs={publicClubs}
        pendingClubs={pendingClubs}
        activeClubId={activeClubId}
        currentUserId={profile.id}
      />
    </div>
  );
}
