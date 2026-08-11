'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayerAvatars } from './player-avatars';
import { formatDate, formatTime, isRegistrationOpen, getRelativeTime } from '@/lib/utils/date';
import { getCrowdLevel } from '@/lib/config';
import type { SessionWithDetails } from '@/types';
import { MapPin, Clock, Users, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionWithDetails;
  currentUserId?: string;
  onRegister?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  compact?: boolean;
}

export function SessionCard({ session, currentUserId, onRegister, onCancel, compact }: SessionCardProps) {
  const activeRegistrations = session.registrations.filter((r) => r.status !== 'CANCELLED');
  const playerCount = activeRegistrations.length;
  const crowdLevel = getCrowdLevel(playerCount, session.max_players);
  const regOpen = isRegistrationOpen(session.registration_open_at, session.registration_close_at);

  const userRegistration = currentUserId
    ? session.registrations.find(
        (r) => r.profiles?.id === currentUserId && r.status !== 'CANCELLED'
      )
    : null;

  const isRegistered = !!userRegistration;

  const crowdColors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusBadge = session.status === 'CANCELLED' ? (
    <Badge variant="destructive" className="text-xs">Đã hủy</Badge>
  ) : session.status === 'FINALIZED' ? (
    <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">Đã chốt chi phí</Badge>
  ) : regOpen ? (
    <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">Đang mở đăng ký</Badge>
  ) : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 border">
      <Link href={`/sessions/${session.id}`}>
        <div className={cn('p-4 sm:p-5', compact && 'p-3')}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm sm:text-base">
                  {formatDate(session.date)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(session.start_time)} - {formatTime(session.end_time)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {session.court_name || 'TBD'}
                </span>
              </div>
            </div>
            {statusBadge}
          </div>

          {/* Players */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PlayerAvatars registrations={session.registrations} />
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  'text-sm font-medium px-1.5 py-0.5 rounded-md',
                  crowdColors[crowdLevel.color]
                )}>
                  {playerCount}{session.max_players ? `/${session.max_players}` : ''} ({crowdLevel.label})
                </span>
              </div>
            </div>

            {/* Action */}
            {session.status !== 'CANCELLED' && session.status !== 'FINALIZED' && (
              <div className="shrink-0">
                {isRegistered ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs h-8 px-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                    onClick={(e) => {
                      e.preventDefault();
                      onCancel?.(session.id);
                    }}
                  >
                    ✓ Đã đăng ký
                  </Button>
                ) : regOpen ? (
                  <Button
                    size="sm"
                    className="rounded-full text-xs h-8 px-4"
                    onClick={(e) => {
                      e.preventDefault();
                      onRegister?.(session.id);
                    }}
                  >
                    Đăng ký
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {session.registration_open_at && new Date() < new Date(session.registration_open_at)
                      ? `Mở lúc ${getRelativeTime(session.registration_open_at)}`
                      : 'Đã đóng'
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}
