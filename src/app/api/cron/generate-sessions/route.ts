import { NextResponse } from 'next/server';
import { generateSessionsFromSchedules } from '@/services/session.service';

/**
 * Vercel Cron: Generate sessions from recurring schedules.
 * Schedule: Every day at 00:00 UTC
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await generateSessionsFromSchedules();
    return NextResponse.json({
      success: true,
      sessionsCreated: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Generate sessions failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate sessions' },
      { status: 500 }
    );
  }
}
