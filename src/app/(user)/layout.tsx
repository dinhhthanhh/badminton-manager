import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/services/user.service';
import { getUnreadNotificationCount } from '@/services/notification.service';
import { getClubName } from '@/services/settings.service';
import { UserLayoutShell } from '@/components/layout/user-layout-shell';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.status === 'PENDING') {
    redirect('/pending');
  }

  if (profile.status === 'BLOCKED' || profile.status === 'REJECTED') {
    redirect('/blocked');
  }

  const [unreadCount, clubName] = await Promise.all([
    getUnreadNotificationCount(),
    getClubName(),
  ]);

  return (
    <UserLayoutShell
      profile={profile}
      unreadCount={unreadCount}
      clubName={clubName}
    >
      {children}
    </UserLayoutShell>
  );
}
