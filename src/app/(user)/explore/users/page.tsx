import { getAllProfiles, getCurrentProfile } from '@/services/user.service';
import { redirect } from 'next/navigation';
import { UsersSearchClient } from '@/components/explore/users-search-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tìm kiếm người chơi cầu lông',
};

export default async function ExploreUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const allUsers = await getAllProfiles('APPROVED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tìm kiếm người chơi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tra cứu trình độ, lịch sử tham gia và độ uy tín của thành viên
        </p>
      </div>

      <UsersSearchClient users={allUsers} currentUserId={profile.id} />
    </div>
  );
}
