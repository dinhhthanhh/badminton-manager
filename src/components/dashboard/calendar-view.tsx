'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerAvatars } from '@/components/session/player-avatars';
import { SlotPickerDialog } from '@/components/schedule/slot-picker-dialog';
import { getAvailabilitySummary } from '@/services/availability.service';
import type { SessionWithDetails } from '@/types';
import { ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarViewProps {
  sessions: SessionWithDetails[];
  currentUserId: string;
  isAdmin?: boolean;
  onRegister: (sessionId: string) => void;
  onCancel: (sessionId: string, sessionDate: string, startTime: string) => void;
}

export function CalendarView({ sessions, currentUserId, isAdmin = false }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [summary, setSummary] = useState<Record<string, { totalVotes: number; uniqueUsers: number; registrations: any[] }>>({});

  // Slot picker modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const dateFrom = format(calendarStart, 'yyyy-MM-dd');
  const dateTo = format(calendarEnd, 'yyyy-MM-dd');

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

  return (
    <Card className="p-2 sm:p-5 space-y-3 sm:space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-bold text-sm sm:text-lg">
            Tháng {format(currentMonth, 'MM, yyyy')}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
            Bấm vào từng ngày để đăng ký khung giờ rảnh hoặc xem thông báo đặt sân từ Admin
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs"
          >
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground border-b pb-1.5">
        {weekDayNames.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Days Grid - Responsive & Mobile Safe */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const daySessions = sessions.filter((s) => s.date === dateStr);
          const daySummary = summary[dateStr] || { totalVotes: 0, uniqueUsers: 0, registrations: [] };
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={`min-h-[75px] sm:min-h-[105px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl border text-xs flex flex-col justify-between cursor-pointer transition-all overflow-hidden hover:border-primary hover:shadow-xs ${
                !isCurrentMonth ? 'bg-muted/30 opacity-40' : 'bg-card'
              } ${isToday ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between gap-0.5 overflow-hidden">
                <span
                  className={`font-bold text-[11px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-md ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* Confirmed Court Badge - Compact on Mobile */}
                {daySessions.length > 0 && (
                  <>
                    <span className="sm:hidden h-2 w-2 rounded-full bg-emerald-500 shrink-0" title={`${daySessions.length} sân`} />
                    <span className="hidden sm:inline-flex text-[10px] whitespace-nowrap bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-1 py-0.5 rounded items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                      {daySessions.length} sân
                    </span>
                  </>
                )}
              </div>

              {/* Middle: Registered Avatars (Max 3) */}
              {daySummary.registrations.length > 0 && (
                <div className="py-0.5 overflow-hidden flex justify-center">
                  <PlayerAvatars registrations={daySummary.registrations} maxDisplay={3} size="sm" />
                </div>
              )}

              {/* Bottom: Registered Count */}
              <div className="mt-auto pt-0.5 sm:pt-1 border-t flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
                {daySummary.uniqueUsers > 0 ? (
                  <span className="text-primary font-semibold flex items-center gap-0.5 truncate">
                    <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    <span>{daySummary.uniqueUsers}</span>
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground/50">Trống</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slot Picker Dialog */}
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
    </Card>
  );
}
