import { createClient } from '@/lib/supabase/server';
import { AdminSchedulesClient } from '@/components/admin/schedules-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Recurring Schedules' };

export default async function AdminSchedulesPage() {
  const supabase = await createClient();
  const { data: schedules } = await supabase
    .from('recurring_schedules')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recurring Schedules</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure weekly badminton schedules</p>
      </div>
      <AdminSchedulesClient schedules={schedules || []} />
    </div>
  );
}
