'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayerAvatars } from '@/components/session/player-avatars';
import { TIME_SLOTS_1H } from '@/lib/config';
import { getAvailabilitySlotsForDate, toggleAvailabilitySlot, confirmCourtBooking, deleteCourtBooking } from '@/services/availability.service';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlotWithProfile } from '@/types';
import { Clock, Calendar, Check, Plus, Loader2, MapPin, Send, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SlotPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateStr: string;
  currentUserId: string;
  isAdmin: boolean;
}

interface ExistingSession {
  id: string;
  court_name: string;
  start_time: string;
  end_time: string;
}

export function SlotPickerDialog({ open, onOpenChange, dateStr, currentUserId, isAdmin }: SlotPickerDialogProps) {
  const router = useRouter();
  const [slots, setSlots] = useState<AvailabilitySlotWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Existing court sessions for this date
  const [existingSessions, setExistingSessions] = useState<ExistingSession[]>([]);

  // Admin booking form state
  const [showAdminBooking, setShowAdminBooking] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [courtName, setCourtName] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSlots = async () => {
    if (!dateStr) return;
    setLoading(true);
    try {
      const data = await getAvailabilitySlotsForDate(dateStr);
      setSlots(data);

      // Check all sessions for this date
      const supabase = createClient();
      const { data: sessList } = await supabase
        .from('sessions')
        .select('id, court_name, start_time, end_time')
        .eq('date', dateStr)
        .order('start_time', { ascending: true });

      setExistingSessions(sessList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && dateStr) {
      loadSlots();
    }
  }, [open, dateStr]);

  // Handle start adding a NEW court session
  const handleStartAddNewCourt = () => {
    setEditingSessionId(null);
    setCourtName('');
    setStartTime('19:00');
    setEndTime('21:00');
    setShowAdminBooking(true);
  };

  // Handle start EDITING an existing court session
  const handleStartEditCourt = (sess: ExistingSession) => {
    setEditingSessionId(sess.id);
    setCourtName(sess.court_name);
    setStartTime(sess.start_time.slice(0, 5));
    setEndTime(sess.end_time.slice(0, 5));
    setShowAdminBooking(true);
  };

  // Optimistic UI slot toggle
  const handleToggle = async (start: string, end: string) => {
    const formattedStart = start.slice(0, 5);
    const isCurrentlySelected = slots.some(
      (s) => s.user_id === currentUserId && s.start_time.startsWith(formattedStart)
    );

    const previousSlots = [...slots];

    if (isCurrentlySelected) {
      setSlots((prev) =>
        prev.filter((s) => !(s.user_id === currentUserId && s.start_time.startsWith(formattedStart)))
      );
    } else {
      const optimisticSlot: AvailabilitySlotWithProfile = {
        id: 'opt-' + Date.now(),
        user_id: currentUserId,
        date: dateStr,
        start_time: start,
        end_time: end,
        created_at: new Date().toISOString(),
        profiles: {
          id: currentUserId,
          full_name: 'Bạn',
          avatar_url: null,
          email: '',
        },
      };
      setSlots((prev) => [...prev, optimisticSlot]);
    }

    try {
      const res = await toggleAvailabilitySlot(dateStr, start, end);
      if (res.success) {
        toast.success(res.added ? 'Đã lưu khung giờ!' : 'Đã bỏ khung giờ', { duration: 800 });
        router.refresh();
      } else {
        setSlots(previousSlots);
        toast.error(res.error || 'Cập nhật thất bại', { duration: 1500 });
      }
    } catch (err) {
      setSlots(previousSlots);
      toast.error('Có lỗi khi lưu vào hệ thống', { duration: 1500 });
    }
  };

  // Confirm / Save court booking
  const handleAdminConfirmBooking = async () => {
    if (!courtName.trim()) {
      toast.error('Vui lòng nhập tên sân & địa điểm đặt');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await confirmCourtBooking({
        date: dateStr,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        courtName: courtName.trim(),
        sessionId: editingSessionId || undefined,
      });

      if (res.success) {
        toast.success(
          editingSessionId
            ? 'Đã cập nhật sân & tự động gửi Gmail tới thành viên!'
            : 'Đã thêm sân mới & gửi Gmail thông báo tới thành viên!',
          { duration: 2000 }
        );
        setShowAdminBooking(false);
        setEditingSessionId(null);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setBookingLoading(false);
    }
  };

  // Delete court booking session
  const handleDeleteCourtBooking = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const res = await deleteCourtBooking(sessionId);
      if (res.success) {
        toast.success('Đã xóa buổi tập sân!', { duration: 1500 });
        setExistingSessions((prev) => prev.filter((s) => s.id !== sessionId));
        router.refresh();
      } else {
        toast.error(res.error || 'Không thể xóa');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setDeletingId(null);
    }
  };

  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b bg-card">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Khung giờ đánh — {formattedDate}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Bấm chọn các khung giờ 1 tiếng bạn rảnh. Hệ thống tự động cập nhật và lưu tức thì!
          </p>
        </DialogHeader>

        {/* Existing Court Booking Sessions Banner List */}
        {existingSessions.length > 0 && !showAdminBooking && (
          <div className="mx-4 sm:mx-5 mt-4 space-y-2">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              Buổi tập đã chốt đặt sân ({existingSessions.length} sân):
            </p>
            {existingSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    {sess.court_name}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Giờ đánh: {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      className="gap-1 border-emerald-400 text-emerald-800 dark:text-emerald-300"
                      onClick={() => handleStartEditCourt(sess)}
                    >
                      <Pencil className="h-3 w-3" /> Sửa
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => handleDeleteCourtBooking(sess.id)}
                      disabled={deletingId === sess.id}
                    >
                      {deletingId === sess.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Xóa
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 pb-6">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Đang tải khung giờ...</p>
            </div>
          ) : (
            TIME_SLOTS_1H.map((slot) => {
              const slotMembers = slots.filter((s) => s.start_time.startsWith(slot.start.slice(0, 5)));
              const isSelectedByMe = slotMembers.some((s) => s.user_id === currentUserId);

              const avatarRegs = slotMembers.map((s) => ({
                id: s.id,
                session_id: '',
                user_id: s.user_id,
                status: 'REGISTERED' as const,
                registered_at: s.created_at,
                cancelled_at: null,
                cancellation_reason: null,
                cancellation_type: null,
                sets_played: 0,
                created_at: s.created_at,
                updated_at: s.created_at,
                profiles: s.profiles,
              }));

              return (
                <div
                  key={slot.start}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isSelectedByMe
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-card hover:bg-muted/40'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                      {slot.label}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <PlayerAvatars registrations={avatarRegs} maxDisplay={3} size="sm" />
                      {slotMembers.length > 0 && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          ({slotMembers.length})
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelectedByMe ? 'default' : 'outline'}
                    className={`h-8 text-xs rounded-full px-3.5 shrink-0 transition-transform active:scale-95 ${isSelectedByMe ? 'shadow-xs' : ''}`}
                    onClick={() => handleToggle(slot.start, slot.end)}
                  >
                    {isSelectedByMe ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" /> Đã chọn
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Chọn giờ
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}

          {/* Admin Announcement / Add Court Booking Form */}
          {isAdmin && (
            <div className="pt-4 border-t mt-4">
              {!showAdminBooking ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                  onClick={handleStartAddNewCourt}
                >
                  <Plus className="h-4 w-4" />
                  {existingSessions.length > 0 ? '[Admin] Thêm Sân Mới' : '[Admin] Xác nhận Đặt Sân'}
                </Button>
              ) : (
                <Card className="p-4 bg-muted/30 border-primary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {editingSessionId ? 'Chỉnh Sửa Sân Đã Đặt (Admin)' : 'Thêm Sân Mới Đặt (Admin)'}
                    </h4>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setShowAdminBooking(false);
                        setEditingSessionId(null);
                      }}
                    >
                      Đóng
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Tên Sân & Địa điểm</Label>
                    <Input
                      placeholder="Ví dụ: Sân Kỳ Hòa - Sân 3"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      className="mt-1 h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Giờ bắt đầu</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1 h-8 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Giờ kết thúc</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="mt-1 h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={handleAdminConfirmBooking}
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {editingSessionId
                        ? 'Lưu thay đổi'
                        : 'Chốt đặt sân'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
