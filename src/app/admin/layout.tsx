import { redirect } from 'next/navigation';
import { getCurrentProfile, getPendingProfilesCount } from '@/services/user.service';
import { getClubName } from '@/services/settings.service';
import { AdminLayoutShell } from '@/components/layout/admin-layout-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const [pendingCount, clubName] = await Promise.all([
    getPendingProfilesCount(),
    getClubName(),
  ]);

  return (
    <AdminLayoutShell
      profile={profile}
      pendingCount={pendingCount}
      clubName={clubName}
    >
      {children}
    </AdminLayoutShell>
  );
}
