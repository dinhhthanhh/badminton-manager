'use client';

import { useState } from 'react';
import { WeeklySlotGrid } from './weekly-slot-grid';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerAvatars } from '@/components/session/player-avatars';
import { formatDate, formatTime, isRegistrationOpen, isWithin24Hours } from '@/lib/utils/date';
import { registerForSession, cancelRegistration } from '@/services/registration.service';
import { getCrowdLevel } from '@/lib/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { SessionWithDetails } from '@/types';
import { Clock, MapPin, Loader2, CalendarCheck, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  sessions: SessionWithDetails[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function ScheduleClient({ sessions, currentUserId, isAdmin = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // View Mode: WEEK (Default 1 row) vs MONTH
  const [scheduleViewMode, setScheduleViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');

  // Cancellation modal state for < 24h
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleRegister = async (sessionId: string) => {
    setLoading(sessionId);
    try {
      const result = await registerForSession(sessionId);
      if (result.success) {
        toast.success('Đăng ký buổi tập thành công!');
        router.refresh();
      } else {
        toast.error(result.error || 'Không thể đăng ký');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelClick = async (sessionId: string, dateStr: string, startTime: string) => {
    const in24h = isWithin24Hours(dateStr, startTime);

    if (!in24h) {
      setLoading(sessionId);
      try {
        const result = await cancelRegistration(sessionId);
        if (result.success) {
          toast.success('Đã hủy đăng ký');
          router.refresh();
        } else {
          toast.error(result.error || 'Không thể hủy');
        }
      } catch {
        toast.error('Có lỗi xảy ra');
      } finally {
        setLoading(null);
      }
    } else {
      setCancelDialog(sessionId);
    }
  };

  const handleConfirmCancelWithReason = async () => {
    if (!cancelDialog) return;
    if (!cancelReason.trim()) {
      toast.error('Buổi tập sắp diễn ra trong 24h, bắt buộc phải nhập lý do hủy');
      return;
    }

    setLoading(cancelDialog);
    try {
      const result = await cancelRegistration(cancelDialog, cancelReason);
      if (result.success) {
        toast.success('Đã hủy đăng ký');
        router.refresh();
      } else {
        toast.error(result.error || 'Không thể hủy đăng ký');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(null);
      setCancelDialog(null);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Schedule View Mode Section */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Đăng ký khung giờ rảnh thi đấu
          </h2>

          {/* Switcher: Theo tuần (mặc định) vs Theo tháng */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setScheduleViewMode('WEEK')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${scheduleViewMode === 'WEEK'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewMode('MONTH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${scheduleViewMode === 'MONTH'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Theo tháng
            </button>
          </div>
        </div>

        {/* Render Week Grid (1 row) vs Month Calendar */}
        {scheduleViewMode === 'WEEK' ? (
          <WeeklySlotGrid
            sessions={sessions}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        ) : (
          <CalendarView
            sessions={sessions}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onRegister={handleRegister}
            onCancel={(id, date, time) => handleCancelClick(id, date, time)}
          />
        )}
      </div>

      {/* Confirmed Court Sessions Section */}
      <div className="pt-4 border-t space-y-4">
        <h2 className="text-lg font-bold">Các buổi tập đã chốt đặt sân</h2>
        {sessions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Chưa có buổi tập nào được chốt sân.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isRegistered = session.registrations.some(
                (r) => r.profiles?.id === currentUserId && r.status !== 'CANCELLED'
              );
              const regOpen = isRegistrationOpen(session.registration_open_at, session.registration_close_at);
              const activeRegs = session.registrations.filter((r) => r.status !== 'CANCELLED');
              const crowdLevel = getCrowdLevel(activeRegs.length, session.max_players);

              return (
                <Card key={session.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base sm:text-lg">
                          {formatDate(session.date)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {crowdLevel.label} ({activeRegs.length}{session.max_players ? `/${session.max_players}` : ''})
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-4 w-4 text-primary" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          {session.court_name}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <PlayerAvatars registrations={session.registrations} maxDisplay={3} />
                        <span className="text-xs text-muted-foreground">
                          {activeRegs.length > 0 ? `${activeRegs.length} thành viên tham gia` : 'Chưa có ai đăng ký'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
                      {session.status !== 'CANCELLED' && session.status !== 'FINALIZED' && (
                        isRegistered ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                            onClick={() => handleCancelClick(session.id, session.date, session.start_time)}
                            disabled={loading === session.id}
                          >
                            {loading === session.id && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            ✓ Đã đăng ký (Nhấn để Hủy)
                          </Button>
                        ) : regOpen ? (
                          <Button
                            size="sm"
                            className="rounded-full text-xs px-5"
                            onClick={() => handleRegister(session.id)}
                            disabled={loading === session.id}
                          >
                            {loading === session.id && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            Đăng ký ngay
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Đã đóng đăng ký</Badge>
                        )
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Modal for < 24h */}
      <Dialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy đăng ký (dưới 24h)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vì buổi tập diễn ra trong vòng 24h tới, vui lòng cung cấp lý do hủy để ban quản trị ghi nhận.
            </p>
            <Textarea
              placeholder="Nhập lý do hủy..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              Giữ lại đăng ký
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancelWithReason}
              disabled={loading === cancelDialog}
            >
              {loading === cancelDialog && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
