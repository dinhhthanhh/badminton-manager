import { getSessionById } from '@/services/session.service';
import { getCurrentProfile } from '@/services/user.service';
import { redirect, notFound } from 'next/navigation';
import { SessionDetailClient } from '@/components/session/session-detail-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Session Details',
};

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const session = await getSessionById(id);
  if (!session) notFound();

  return <SessionDetailClient session={session} currentUserId={profile.id} />;
}
