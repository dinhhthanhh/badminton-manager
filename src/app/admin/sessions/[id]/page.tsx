import { getSessionById } from '@/services/session.service';
import { notFound } from 'next/navigation';
import { AdminSessionDetailClient } from '@/components/admin/session-detail-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Session Details' };

export default async function AdminSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) notFound();

  return <AdminSessionDetailClient session={session} />;
}
