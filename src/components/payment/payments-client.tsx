'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatVND } from '@/lib/utils/money';
import { formatTime } from '@/lib/utils/date';
import { markPaymentAsPaid } from '@/services/payment.service';
import { CourtSvgIcon, ShuttlecockSvgIcon, DrinkSvgIcon, WalletMoneySvgIcon } from '@/components/icons/custom-svg-icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { SessionWithDetails, PaymentWithDetails } from '@/types';
import type { SessionCostDetail } from '@/services/bill.service';
import {
  Clock, MapPin, Users, Loader2, Eye, CheckCircle2,
  CalendarOff, BadgeInfo, CreditCard, UserPlus,
} from 'lucide-react';

interface Props {
  payments: PaymentWithDetails[];
  sessions: SessionWithDetails[];
  costDetails: Record<string, SessionCostDetail>;
  userId: string;
}

// Helper: compute cost totals from detail
function computeTotals(detail: SessionCostDetail | null) {
  if (!detail) return { court: 0, shuttle: 0, water: 0, total: 0 };
  const court = detail.courtHourlyRate * detail.courtHours;
  const shuttle = detail.shuttlecockTypes.reduce((s, t) => s + t.quantity * t.pricePerUnit, 0);
  const water = detail.waterCost;
  return { court, shuttle, water, total: court + shuttle + water };
}

// Helper: compute per-player cost
function computePlayerCosts(
  detail: SessionCostDetail | null,
  attendees: { userId: string; name: string; setsPlayed: number }[]
) {
  const totals = computeTotals(detail);
  if (totals.total === 0 || attendees.length === 0) return [];

  const allPlayers = [
    ...attendees,
    ...(detail?.walkInPlayers || []).map((w) => ({
      userId: `walkin_${w.id}`,
      name: w.name,
      setsPlayed: w.setsPlayed,
    })),
  ];

  const totalSets = allPlayers.reduce((s, p) => s + p.setsPlayed, 0);
  if (totalSets === 0) {
    const n = allPlayers.length;
    return allPlayers.map((p) => ({
      ...p,
      courtShare: Math.round(totals.court / n),
      shuttleShare: Math.round(totals.shuttle / n),
      waterShare: Math.round(totals.water / n),
      totalShare: Math.round(totals.total / n),
    }));
  }

  return allPlayers.map((p) => {
    const ratio = p.setsPlayed / totalSets;
    return {
      ...p,
      courtShare: Math.round(totals.court * ratio),
      shuttleShare: Math.round(totals.shuttle * ratio),
      waterShare: Math.round(totals.water * ratio),
      totalShare: Math.round(totals.total * ratio),
    };
  });
}

export function PaymentsClient({ payments, sessions, costDetails, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState<string | null>(null);

  const handleMarkPaid = async (paymentId: string) => {
    setLoading(paymentId);
    try {
      const result = await markPaymentAsPaid(paymentId);
      if (result.success) {
        toast.success('Đã xác nhận chuyển khoản!');
        router.refresh();
      } else {
        toast.error(result.error || 'Cập nhật thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(null);
    }
  };

  // Calculate outstanding total
  const outstanding = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.total_amount, 0);

  // Group sessions by week
  const today = format(new Date(), 'yyyy-MM-dd');

  // Filter sessions that have cost data
  const sessionsWithCosts = sessions.filter((s) => {
    const detail = costDetails[s.id];
    return detail && (detail.courtHourlyRate > 0 || detail.shuttlecockTypes.length > 0 || detail.waterCost > 0);
  });

  const sessionsWithoutCosts = sessions.filter((s) => {
    const detail = costDetails[s.id];
    return !detail || (detail.courtHourlyRate === 0 && detail.shuttlecockTypes.length === 0 && detail.waterCost === 0);
  });

  if (sessions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <CalendarOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-base mb-1">
          Chưa có buổi đánh nào gần đây
        </h3>
        <p className="text-sm text-muted-foreground">
          Bạn chưa tham gia buổi đánh cầu nào trong thời gian gần đây.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outstanding Amount Warning */}
      {outstanding > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tổng tiền còn cần thanh toán</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatVND(outstanding)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions with Costs */}
      {sessionsWithCosts.map((session) => {
        const detail = costDetails[session.id];
        const totals = computeTotals(detail);

        const attendees = session.registrations
          .filter((r) => r.status === 'ATTENDED')
          .map((r) => ({
            userId: r.user_id,
            name: r.profiles.full_name,
            setsPlayed: r.sets_played,
            avatar: r.profiles.avatar_url,
          }));

        const playerCosts = computePlayerCosts(
          detail,
          attendees.map((a) => ({ userId: a.userId, name: a.name, setsPlayed: a.setsPlayed }))
        );

        const myCost = playerCosts.find((pc) => pc.userId === userId);
        const myReg = session.registrations.find((r) => r.user_id === userId);
        const sessionPayment = payments.find((p) => p.session_id === session.id);
        const totalSets = playerCosts.reduce((s, p) => s + p.setsPlayed, 0);

        if (!myCost) return null;

        return (
          <Card key={session.id} className="overflow-hidden hover:border-emerald-500/30 transition-all">
            {/* Session Header */}
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {format(new Date(session.date + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
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
                      {attendees.length} người
                    </span>
                  </div>
                </div>

                {sessionPayment && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] shrink-0 ${
                      sessionPayment.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : sessionPayment.status === 'PAID'
                          ? 'bg-blue-100 text-blue-700'
                          : sessionPayment.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {sessionPayment.status === 'VERIFIED' && <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Đã xác nhận</>}
                    {sessionPayment.status === 'PAID' && 'Chờ Admin duyệt'}
                    {sessionPayment.status === 'PENDING' && 'Chờ thanh toán'}
                    {sessionPayment.status === 'REJECTED' && 'Bị từ chối'}
                  </Badge>
                )}
              </div>

              {/* My Cost Breakdown */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 via-card to-emerald-50/30 dark:from-emerald-950/20 dark:via-card dark:to-emerald-950/10 border border-emerald-200/40 space-y-2.5 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CourtSvgIcon className="w-4 h-4" />
                    Sân ({formatVND(detail.courtHourlyRate)}/giờ × {detail.courtHours}h)
                  </span>
                  <span className="font-semibold">{formatVND(myCost.courtShare)}</span>
                </div>

                {detail.shuttlecockTypes.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ShuttlecockSvgIcon className="w-4 h-4" />
                      Cầu ({detail.shuttlecockTypes.map((st) =>
                        `${st.name || 'Cầu'} ${st.quantity}q`
                      ).join(', ')})
                    </span>
                    <span className="font-semibold">{formatVND(myCost.shuttleShare)}</span>
                  </div>
                )}

                {totals.water > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <DrinkSvgIcon className="w-4 h-4" />
                      Nước (tổng {formatVND(totals.water)})
                    </span>
                    <span className="font-semibold">{formatVND(myCost.waterShare)}</span>
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                  Bạn đánh {myCost.setsPlayed}/{totalSets} séc → chia theo tỉ lệ séc
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <WalletMoneySvgIcon className="w-4 h-4" /> Bạn cần trả:
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVND(myCost.totalShare)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Detail Dialog */}
                <Dialog
                  open={detailDialog === session.id}
                  onOpenChange={(open) => setDetailDialog(open ? session.id : null)}
                >
                  <DialogTrigger className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent transition-colors flex-1 justify-center">
                      <Eye className="h-3 w-3" /> Xem chi tiết buổi đánh
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                        <BadgeInfo className="h-4 w-4 text-emerald-600" />
                        Chi tiết buổi đánh - {format(new Date(session.date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                      {/* Session info */}
                      <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1">
                        <p><strong>Sân:</strong> {session.court_name}</p>
                        <p><strong>Giờ:</strong> {formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
                        <p><strong>Số người:</strong> {playerCosts.length}</p>
                        <p><strong>Tổng séc:</strong> {totalSets}</p>
                      </div>

                      {/* Cost breakdown */}
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border text-xs space-y-1">
                        <p className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <CourtSvgIcon className="w-4 h-4" /> Tiền sân
                        </p>
                        <p>{formatVND(detail.courtHourlyRate)}/giờ × {detail.courtHours} giờ = {formatVND(totals.court)}</p>
                      </div>

                      {detail.shuttlecockTypes.length > 0 && (
                        <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border text-xs space-y-1">
                          <p className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                            <ShuttlecockSvgIcon className="w-4 h-4" /> Tiền cầu
                          </p>
                          {detail.shuttlecockTypes.map((st, i) => (
                            <p key={i}>
                              {st.name || `Loại ${i + 1}`}: {st.quantity} quả × {formatVND(st.pricePerUnit)} = {formatVND(st.quantity * st.pricePerUnit)}
                            </p>
                          ))}
                          <p className="font-medium">Tổng: {formatVND(totals.shuttle)}</p>
                        </div>
                      )}

                      {totals.water > 0 && (
                        <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border text-xs space-y-1">
                          <p className="font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                            <DrinkSvgIcon className="w-4 h-4" /> Tiền nước
                          </p>
                          <p>Tổng: {formatVND(totals.water)}</p>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border">
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <WalletMoneySvgIcon className="w-4 h-4" /> Tổng chi phí:
                          </span>
                          {formatVND(totals.total)}
                        </p>
                      </div>

                      <Separator />

                      {/* All players breakdown */}
                      <p className="font-semibold text-sm flex items-center gap-1">
                        <Users className="h-4 w-4 text-emerald-600" />
                        Phân chia cho {playerCosts.length} người
                      </p>

                      {playerCosts.map((pc) => {
                        const isMe = pc.userId === userId;
                        const isWalkIn = pc.userId.startsWith('walkin_');
                        return (
                          <div
                            key={pc.userId}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              isMe
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 ring-1 ring-emerald-400/30'
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm flex items-center gap-1.5">
                                {isWalkIn && <UserPlus className="h-3.5 w-3.5 text-amber-600" />}
                                {pc.name}
                                {isMe && (
                                  <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700 ml-1">
                                    Bạn
                                  </Badge>
                                )}
                                {isWalkIn && (
                                  <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-600 ml-1">
                                    Khách
                                  </Badge>
                                )}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {pc.setsPlayed}/{totalSets} séc
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                              <span>Sân: {formatVND(pc.courtShare)}</span>
                              <span>Cầu: {formatVND(pc.shuttleShare)}</span>
                              <span>Nước: {formatVND(pc.waterShare)}</span>
                            </div>
                            <div className={`text-right font-bold text-sm ${isMe ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                              {formatVND(pc.totalShare)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDetailDialog(null)}>
                        Đóng
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Pay Button */}
                {sessionPayment?.status === 'PENDING' && (
                  <Button
                    size="sm"
                    className="rounded-full text-xs px-4 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleMarkPaid(sessionPayment.id)}
                    disabled={loading === sessionPayment.id}
                  >
                    {loading === sessionPayment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Đã chuyển khoản
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Sessions without cost data yet (upcoming or admin hasn't entered) */}
      {sessionsWithoutCosts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            Buổi đánh chưa có chi phí ({sessionsWithoutCosts.length})
          </p>
          {sessionsWithoutCosts.map((session) => {
            const myReg = session.registrations.find((r) => r.user_id === userId);
            return (
              <Card key={session.id} className="p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(session.date + 'T00:00:00'), 'EEEE, dd/MM', { locale: vi })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(session.start_time)} - {formatTime(session.end_time)} · {session.court_name}
                      {myReg && ` · ${myReg.sets_played} séc`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Chờ Admin nhập chi phí
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
