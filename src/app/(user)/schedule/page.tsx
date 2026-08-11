import { getUpcomingSessions } from '@/services/session.service';
import { getCurrentProfile } from '@/services/user.service';
import { redirect } from 'next/navigation';
import { ScheduleClient } from '@/components/schedule/schedule-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lịch thi đấu & Đăng ký khung giờ',
};

export default async function SchedulePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const sessions = await getUpcomingSessions(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Lịch thi đấu & Đăng ký khung giờ đánh</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chủ động chọn khung giờ rảnh trong ngày/tuần. Admin sẽ chốt đặt sân và phát thông báo tới cả CLB!
        </p>
      </div>

      <ScheduleClient
        sessions={sessions}
        currentUserId={profile.id}
        isAdmin={profile.role === 'ADMIN'}
      />
    </div>
  );
}
