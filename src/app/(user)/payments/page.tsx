import { getCurrentProfile } from '@/services/user.service';
import { getUserPayments } from '@/services/payment.service';
import { getSessionsForDateRange } from '@/services/session.service';
import { getBatchSessionCostDetails } from '@/services/bill.service';
import { redirect } from 'next/navigation';
import { PaymentsClient } from '@/components/payment/payments-client';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán',
};

export default async function PaymentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const payments = await getUserPayments(profile.id);

  // Get sessions for a wider range (2 weeks back + 1 week ahead) to show recent/upcoming
  const now = new Date();
  const rangeStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const dateFrom = format(rangeStart, 'yyyy-MM-dd');
  const dateTo = format(rangeEnd, 'yyyy-MM-dd');

  const allSessions = await getSessionsForDateRange(dateFrom, dateTo);

  // Filter to only sessions where this user has ATTENDED status
  const userSessions = allSessions.filter((s) =>
    s.registrations.some(
      (r) => r.user_id === profile.id && r.status === 'ATTENDED'
    )
  );

  const sessionIds = userSessions.map((s) => s.id);
  const costDetails = await getBatchSessionCostDetails(sessionIds);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chi phí Cầu lông</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chi tiết chi phí từng buổi đánh cầu của bạn
        </p>
      </div>

      <PaymentsClient
        payments={payments}
        sessions={userSessions}
        costDetails={costDetails}
        userId={profile.id}
      />
    </div>
  );
}
