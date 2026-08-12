import { getSessionsForDateRange } from '@/services/session.service';
import { getAllPayments } from '@/services/payment.service';
import { getBatchSessionCostDetails } from '@/services/bill.service';
import { AdminPaymentsClient } from '@/components/admin/payments-client';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chi phí Câu lạc bộ' };

export default async function AdminPaymentsPage() {
  // Get current week range (can be overridden by client-side week navigation)
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  // Fetch sessions for this week with registrations
  const sessions = await getSessionsForDateRange(dateFrom, dateTo);

  // Fetch cost details for all sessions
  const sessionIds = sessions.map((s) => s.id);
  const costDetails = await getBatchSessionCostDetails(sessionIds);

  // Fetch payments for cross-reference
  const payments = await getAllPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chi phí Câu lạc bộ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý chi phí theo từng buổi đánh cầu
        </p>
      </div>
      <AdminPaymentsClient
        initialSessions={sessions}
        initialCostDetails={costDetails}
        payments={payments}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
      />
    </div>
  );
}
