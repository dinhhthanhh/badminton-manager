import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { formatVND } from '@/lib/utils/money';
import type { Metadata } from 'next';
import { CalendarDays, Users, CreditCard, TrendingUp } from 'lucide-react';

export const metadata: Metadata = { title: 'Reports' };

export default async function AdminReportsPage() {
  const adminClient = createAdminClient();

  let sessions: any[] = [];
  let payments: any[] = [];

  try {
    const [{ data: sData }, { data: pData }] = await Promise.all([
      adminClient
        .from('sessions')
        .select('*, session_costs(*), registrations(status)')
        .eq('status', 'FINALIZED')
        .order('date', { ascending: false })
        .limit(50),
      adminClient.from('payments').select('total_amount, status'),
    ]);

    sessions = sData || [];
    payments = pData || [];
  } catch (err) {
    console.error('[Admin Reports] Query error:', err);
  }

  const totalSessions = sessions.length;
  const totalAttendees = sessions.reduce(
    (sum, s) => sum + (s.registrations?.filter((r: { status: string }) => r.status === 'ATTENDED').length || 0),
    0
  );

  const totalCost = sessions.reduce(
    (sum, s) => {
      const costs = Array.isArray(s.session_costs) ? s.session_costs[0] : s.session_costs;
      if (!costs) return sum;
      return sum + (costs.court_cost || 0) + (costs.shuttlecock_cost || 0) + (costs.other_cost || 0);
    },
    0
  );

  const outstandingTotal = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial overview and statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
              <p className="text-xl font-bold">{totalSessions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Attendees</p>
              <p className="text-xl font-bold">{totalAttendees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold">{formatVND(totalCost)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold">{formatVND(outstandingTotal)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Session Reports Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Session Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Players</th>
                <th className="text-right p-3 font-medium">Court</th>
                <th className="text-right p-3 font-medium">Shuttle</th>
                <th className="text-right p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const costs = Array.isArray(session.session_costs) ? session.session_costs[0] : session.session_costs;
                const attended = session.registrations?.filter((r: { status: string }) => r.status === 'ATTENDED').length || 0;
                return (
                  <tr key={session.id} className="border-b last:border-0">
                    <td className="p-3">{session.date}</td>
                    <td className="p-3 text-right">{attended}</td>
                    <td className="p-3 text-right">{formatVND(costs?.court_cost || 0)}</td>
                    <td className="p-3 text-right">{formatVND(costs?.shuttlecock_cost || 0)}</td>
                    <td className="p-3 text-right font-medium">
                      {formatVND((costs?.court_cost || 0) + (costs?.shuttlecock_cost || 0) + (costs?.other_cost || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
