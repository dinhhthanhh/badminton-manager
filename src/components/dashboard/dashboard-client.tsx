'use client';

import { useState } from 'react';
import { SessionCard } from '@/components/session/session-card';
import { CalendarView } from './calendar-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatVND } from '@/lib/utils/money';
import { registerForSession, cancelRegistration } from '@/services/registration.service';
import { isWithin24Hours } from '@/lib/utils/date';
import { toast } from 'sonner';
import type { SessionWithDetails } from '@/types';
import { CalendarDays, CreditCard, TrendingUp, Loader2, List, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isSameWeek, isSameMonth, isSameYear, parseISO } from 'date-fns';

interface DashboardClientProps {
  sessions: SessionWithDetails[];
  currentUserId: string;
  isAdmin?: boolean;
  outstandingAmount: number;
  attendedCount: number;
}

export function DashboardClient({ sessions, currentUserId, isAdmin = false, outstandingAmount, attendedCount }: DashboardClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('CALENDAR');

  // Cancel Dialog state for < 24h cancellation
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const now = new Date();

  // Filter sessions based on time period
  const filteredSessions = sessions.filter((session) => {
    const sessionDate = parseISO(session.date);
    if (periodFilter === 'WEEK') return isSameWeek(sessionDate, now, { weekStartsOn: 1 });
    if (periodFilter === 'MONTH') return isSameMonth(sessionDate, now);
    if (periodFilter === 'YEAR') return isSameYear(sessionDate, now);
    return true;
  });

  const handleRegister = async (sessionId: string) => {
    setLoading(sessionId);
    try {
      const result = await registerForSession(sessionId);
      if (result.success) {
        toast.success('Đăng ký tham gia thành công!');
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
      // Free 1-tap cancellation (> 24 hours)
      setLoading(sessionId);
      try {
        const result = await cancelRegistration(sessionId);
        if (result.success) {
          toast.success('Đã hủy đăng ký thành công (trước 24h)');
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
      // Must prompt for cancellation reason (< 24 hours)
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

      {/* Filters and View Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Period Filter */}
        <Tabs value={periodFilter} onValueChange={(val) => setPeriodFilter(val as any)}>
          <TabsList>
            <TabsTrigger value="ALL">Tất cả</TabsTrigger>
            <TabsTrigger value="WEEK">Tuần này</TabsTrigger>
            <TabsTrigger value="MONTH">Tháng này</TabsTrigger>
            <TabsTrigger value="YEAR">Năm này</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('CALENDAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'CALENDAR' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Dạng lịch
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'LIST' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Danh sách
          </button>
        </div>
      </div>

      {/* Main Content Area: List vs Calendar */}
      {viewMode === 'CALENDAR' ? (
        <CalendarView
          sessions={filteredSessions}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRegister={handleRegister}
          onCancel={(id, date, time) => handleCancelClick(id, date, time)}
        />
      ) : (
        <div>
          {filteredSessions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Chưa có lịch tập trong khoảng thời gian này</h3>
              <p className="text-sm text-muted-foreground">
                Hãy thử chọn khoảng thời gian khác hoặc quay lại sau!
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  currentUserId={currentUserId}
                  onRegister={handleRegister}
                  onCancel={() => handleCancelClick(session.id, session.date, session.start_time)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reason Dialog for < 24h Cancellation */}
      <Dialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buổi tập sắp diễn ra trong 24 giờ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vì buổi tập chỉ còn dưới 24 giờ nữa sẽ bắt đầu, vui lòng nhập lý do hủy để ban quản trị ghi nhận.
            </p>
            <Textarea
              placeholder="Nhập lý do hủy sân khẩn cấp..."
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
