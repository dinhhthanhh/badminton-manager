import { getCurrentProfile, getUserStats } from '@/services/user.service';
import { getUserRegistrations } from '@/services/registration.service';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils/date';
import { formatVND } from '@/lib/utils/money';
import type { Metadata } from 'next';
import { CalendarCheck, CalendarX, AlertTriangle, CreditCard, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lịch sử hoạt động',
};

export default async function HistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const [stats, registrations] = await Promise.all([
    getUserStats(profile.id),
    getUserRegistrations(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử hoạt động</h1>
        <p className="text-muted-foreground text-sm mt-1">Thống kê quá trình tập luyện và đóng góp của bạn</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã tham gia</p>
              <p className="text-lg font-bold">{stats.attendedSessions} buổi</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <CalendarX className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã hủy</p>
              <p className="text-lg font-bold">{stats.cancelledSessions} buổi</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số set đã đánh</p>
              <p className="text-lg font-bold">{stats.totalSetsPlayed} set</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã chi trả</p>
              <p className="text-lg font-bold">{formatVND(stats.totalMoneySpent)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* No-show warning */}
      {stats.noShowSessions > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Bạn có {stats.noShowSessions} lần vắng mặt không báo trước (No-show).
            </p>
          </div>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h2 className="font-semibold mb-4">Nhật ký hoạt động</h2>
        {registrations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Chưa có hoạt động nào. Hãy đăng ký tham gia buổi tập mới!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg: any) => {
              const session = reg.sessions as { id: string; date: string; start_time: string; end_time: string; court_name: string } | null;
              if (!session) return null;

              const statusMap: Record<string, { label: string; style: string }> = {
                REGISTERED: { label: 'Đã đăng ký', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                ATTENDED: { label: 'Đã tham gia', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                CANCELLED: { label: 'Đã hủy', style: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
                ABSENT: { label: 'Vắng mặt', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                NO_SHOW: { label: 'Vắng mặt (No-show)', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
              };

              const statusInfo = statusMap[reg.status] || { label: reg.status, style: 'bg-muted' };

              return (
                <Card key={reg.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                        <span className="text-lg">🏸</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formatDate(session.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)} · {session.court_name}
                        </p>
                        {reg.sets_played > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Đã đánh {reg.sets_played} set</p>
                        )}
                        {reg.cancellation_reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Lý do hủy: {reg.cancellation_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={statusInfo.style} variant="secondary">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
