import { getAllSessions } from '@/services/session.service';
import { AdminSessionsClient } from '@/components/admin/sessions-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sessions' };

export default async function AdminSessionsPage() {
  const sessions = await getAllSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage badminton sessions</p>
      </div>
      <AdminSessionsClient sessions={sessions} />
    </div>
  );
}
