'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerAvatars } from '@/components/session/player-avatars';
import { formatDate, formatTime } from '@/lib/utils/date';
import type { SessionWithDetails } from '@/types';
import { CalendarDays, MapPin, Clock, Users, ChevronRight } from 'lucide-react';

interface Props {
  sessions: SessionWithDetails[];
}

export function AdminSessionsClient({ sessions }: Props) {
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL'
    ? sessions
    : sessions.filter((s) => s.status === filter);

  const statusMap: Record<string, { label: string; style: string }> = {
    UPCOMING: { label: 'Sắp tới', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    REGISTRATION_OPEN: { label: 'Mở đăng ký', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    REGISTRATION_CLOSED: { label: 'Đã đóng', style: 'bg-gray-100 text-gray-600' },
    COMPLETED: { label: 'Đã tập xong', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    FINALIZED: { label: 'Đã chốt tiền', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    CANCELLED: { label: 'Đã hủy', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
          <TabsTrigger value="UPCOMING">Sắp tới</TabsTrigger>
          <TabsTrigger value="COMPLETED">Hoàn thành</TabsTrigger>
          <TabsTrigger value="FINALIZED">Đã chốt chi phí</TabsTrigger>
          <TabsTrigger value="CANCELLED">Đã hủy</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Không tìm thấy buổi tập nào.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => {
            const statusInfo = statusMap[session.status] || { label: session.status, style: '' };
            return (
              <Link key={session.id} href={`/admin/sessions/${session.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm">{formatDate(session.date)}</span>
                        <Badge variant="secondary" className={`text-[10px] ${statusInfo.style}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.court_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.registration_count} người đăng ký
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PlayerAvatars registrations={session.registrations} maxDisplay={3} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
