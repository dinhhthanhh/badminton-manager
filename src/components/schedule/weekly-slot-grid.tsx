'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerAvatars } from '@/components/session/player-avatars';
import { SlotPickerDialog } from './slot-picker-dialog';
import { getAvailabilitySummary } from '@/services/availability.service';
import { ChevronLeft, ChevronRight, Calendar, Users, CheckCircle2, MapPin } from 'lucide-react';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns';
import type { SessionWithDetails } from '@/types';

interface WeeklySlotGridProps {
  sessions: SessionWithDetails[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function WeeklySlotGrid({ sessions, currentUserId, isAdmin = false }: WeeklySlotGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [summary, setSummary] = useState<Record<string, { totalVotes: number; uniqueUsers: number; registrations: any[] }>>({});

  // Slot picker modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });     // Sunday
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const loadSummary = async () => {
    try {
      const data = await getAvailabilitySummary(dateFrom, dateTo);
      setSummary(data as any);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [dateFrom, dateTo]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-bold text-base sm:text-lg">
            Tuần {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            Tuần trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
            className="text-xs"
          >
            Tuần này
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="gap-1 text-xs"
          >
            Tuần sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* 7 Days Grid Cards (Mon -> Sun) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {daysInWeek.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          const daySummary = summary[dateStr] || { totalVotes: 0, uniqueUsers: 0, registrations: [] };
          const daySessions = sessions.filter((s) => s.date === dateStr);

          return (
            <Card
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={`p-3.5 min-h-[160px] flex flex-col justify-between cursor-pointer transition-all hover:border-primary hover:shadow-md ${isToday ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'bg-card'
                }`}
            >
              {/* Header & Middle Content */}
              <div className="space-y-3">
                {/* Day Name & Date */}
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className={`font-bold text-sm ${isToday ? 'text-primary' : ''}`}>
                    {dayLabels[idx]}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(day, 'dd/MM')}
                  </span>
                </div>

                {/* Confirmed Court Sessions info for this day (Above Avatars) */}
                {daySessions.length > 0 && (
                  <div className="space-y-1">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                          <span>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-muted-foreground truncate flex items-center gap-1 font-medium">
                          <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                          {s.court_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Member Avatars (Moved UP above bottom bar, Max 8 displayed) */}
                {daySummary.registrations.length > 0 && (
                  <div className="py-1">
                    <PlayerAvatars registrations={daySummary.registrations} maxDisplay={8} size="sm" />
                  </div>
                )}
              </div>

              {/* Fixed Bottom Bar: Available Count & Action */}
              <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                  {daySummary.uniqueUsers > 0 ? `${daySummary.uniqueUsers}` : 'Trống'}
                </span>
                <span className="font-bold text-primary text-[11px] shrink-0">
                  Chọn giờ →
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Time Slot Picker Dialog when a day is clicked */}
      {selectedDate && (
        <SlotPickerDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) loadSummary();
          }}
          dateStr={selectedDate}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
