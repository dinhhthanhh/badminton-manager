import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { formatVND } from '@/lib/utils/money';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import { Users, Clock, CalendarDays, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tổng quan Quản trị',
};

export default async function AdminDashboardPage() {
  const adminClient = createAdminClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  let totalMembers = 0;
  let pendingApprovals = 0;
  let upcomingSessions = 0;
  let todayPlayersCount = 0;
  let pendingPaymentsCount = 0;
  let outstandingTotal = 0;

  try {
    const [
      { count: approvedCount },
      { count: pendingCount },
      { count: sessionCount },
      { data: todaySessions },
      { data: pendingPayments },
    ] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      adminClient.from('sessions').select('*', { count: 'exact', head: true }).gte('date', today).neq('status', 'CANCELLED'),
      adminClient.from('sessions').select('id').eq('date', today),
      adminClient.from('payments').select('total_amount').eq('status', 'PENDING'),
    ]);

    totalMembers = approvedCount || 0;
    pendingApprovals = pendingCount || 0;
    upcomingSessions = sessionCount || 0;

    if (todaySessions && todaySessions.length > 0) {
      const todaySessionIds = todaySessions.map((s) => s.id);
      const { count: regCount } = await adminClient
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .in('session_id', todaySessionIds)
        .neq('status', 'CANCELLED');
      todayPlayersCount = regCount || 0;
    }

    if (pendingPayments) {
      pendingPaymentsCount = pendingPayments.length;
      outstandingTotal = pendingPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    }
  } catch (err) {
    console.error('[Admin Dashboard] Query error:', err);
  }

  const stats = [
    {
      label: 'Tổng thành viên',
      value: `${totalMembers} người`,
      icon: Users,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      href: '/admin/members',
    },
    {
      label: 'Chờ duyệt tài khoản',
      value: `${pendingApprovals} người`,
      icon: Clock,
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      href: '/admin/members',
      alert: pendingApprovals > 0,
    },
    {
      label: 'Buổi tập sắp tới',
      value: `${upcomingSessions} buổi`,
      icon: CalendarDays,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      href: '/admin/sessions',
    },
    {
      label: 'Người tham gia hôm nay',
      value: `${todayPlayersCount} người`,
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      href: '/admin/sessions',
    },
    {
      label: 'Tổng tiền còn nợ',
      value: formatVND(outstandingTotal),
      icon: CreditCard,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      href: '/admin/payments',
    },
    {
      label: 'Khoản chờ duyệt tiền',
      value: `${pendingPaymentsCount} khoản`,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      href: '/admin/payments',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan Quản trị</h1>
        <p className="text-muted-foreground text-sm mt-1">Báo cáo tình hình hoạt động của câu lạc bộ</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`p-4 sm:p-5 hover:shadow-md transition-shadow ${stat.alert ? 'border-amber-300 dark:border-amber-800' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">{stat.label}</p>
                  <p className="text-xl font-bold truncate">{stat.value}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
