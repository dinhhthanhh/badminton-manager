'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatVND } from '@/lib/utils/money';
import { formatDate, formatTime } from '@/lib/utils/date';
import { saveSessionCostDetails, type SessionCostDetail, type ShuttlecockType, type WalkInPlayer } from '@/services/bill.service';
import { getSessionsForDateRange } from '@/services/session.service';
import { getBatchSessionCostDetails } from '@/services/bill.service';
import { verifyPayment, rejectPayment } from '@/services/payment.service';
import { CourtSvgIcon, ShuttlecockSvgIcon, DrinkSvgIcon, WalletMoneySvgIcon } from '@/components/icons/custom-svg-icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { SessionWithDetails, PaymentWithDetails } from '@/types';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  Users, Save, Loader2, Plus, Trash2, Eye, CheckCircle2,
  XCircle, CalendarOff, PieChart, UserPlus, BadgeInfo,
} from 'lucide-react';

interface Props {
  initialSessions: SessionWithDetails[];
  initialCostDetails: Record<string, SessionCostDetail>;
  payments: PaymentWithDetails[];
  initialDateFrom: string;
  initialDateTo: string;
}

// Helper: compute cost totals from detail
function computeTotals(detail: SessionCostDetail | null) {
  if (!detail) return { court: 0, shuttle: 0, water: 0, total: 0 };
  const court = detail.courtHourlyRate * detail.courtHours;
  const shuttle = detail.shuttlecockTypes.reduce((s, t) => s + t.quantity * t.pricePerUnit, 0);
  const water = detail.waterCost;
  return { court, shuttle, water, total: court + shuttle + water };
}

// Helper: compute per-player cost based on sets
function computePlayerCosts(
  detail: SessionCostDetail | null,
  attendees: { userId: string; name: string; setsPlayed: number }[]
) {
  const totals = computeTotals(detail);
  if (totals.total === 0 || attendees.length === 0) return [];

  // Include walk-in players
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
    // Split evenly if no sets recorded
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

export function AdminPaymentsClient({
  initialSessions,
  initialCostDetails,
  payments,
  initialDateFrom,
  initialDateTo,
}: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [costDetails, setCostDetails] = useState(initialCostDetails);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [savingSession, setSavingSession] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Local edit states per session
  const [editStates, setEditStates] = useState<Record<string, SessionCostDetail>>({});

  // Initialize edit states from loaded cost details
  useEffect(() => {
    const initial: Record<string, SessionCostDetail> = {};
    for (const s of sessions) {
      if (costDetails[s.id]) {
        initial[s.id] = { ...costDetails[s.id] };
      } else {
        // Calculate default hours from session times
        const startParts = s.start_time.split(':').map(Number);
        const endParts = s.end_time.split(':').map(Number);
        const hours = (endParts[0] + endParts[1] / 60) - (startParts[0] + startParts[1] / 60);

        initial[s.id] = {
          sessionId: s.id,
          courtHourlyRate: 0,
          courtHours: Math.max(1, Math.round(hours)),
          shuttlecockTypes: [],
          waterCost: 0,
          walkInPlayers: [],
        };
      }
    }
    setEditStates(initial);
  }, [sessions, costDetails]);

  // Week navigation
  const navigateWeek = useCallback(async (direction: 'prev' | 'next' | 'current') => {
    setLoadingWeek(true);
    try {
      let baseDate: Date;
      if (direction === 'current') {
        baseDate = new Date();
      } else {
        const currentStart = new Date(dateFrom + 'T00:00:00');
        baseDate = direction === 'next' ? addWeeks(currentStart, 1) : subWeeks(currentStart, 1);
      }

      const newStart = startOfWeek(baseDate, { weekStartsOn: 1 });
      const newEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
      const newDateFrom = format(newStart, 'yyyy-MM-dd');
      const newDateTo = format(newEnd, 'yyyy-MM-dd');

      const newSessions = await getSessionsForDateRange(newDateFrom, newDateTo);
      const newSessionIds = newSessions.map((s) => s.id);
      const newCostDetails = await getBatchSessionCostDetails(newSessionIds);

      setSessions(newSessions);
      setCostDetails(newCostDetails);
      setDateFrom(newDateFrom);
      setDateTo(newDateTo);
      setExpandedSession(null);
    } catch {
      toast.error('Không thể tải dữ liệu tuần');
    } finally {
      setLoadingWeek(false);
    }
  }, [dateFrom]);

  // Edit handlers
  const updateEdit = (sessionId: string, updates: Partial<SessionCostDetail>) => {
    setEditStates((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], ...updates },
    }));
  };

  const addShuttlecockType = (sessionId: string) => {
    const current = editStates[sessionId];
    if (!current) return;
    updateEdit(sessionId, {
      shuttlecockTypes: [
        ...current.shuttlecockTypes,
        { name: '', quantity: 1, pricePerUnit: 0 },
      ],
    });
  };

  const removeShuttlecockType = (sessionId: string, index: number) => {
    const current = editStates[sessionId];
    if (!current) return;
    updateEdit(sessionId, {
      shuttlecockTypes: current.shuttlecockTypes.filter((_, i) => i !== index),
    });
  };

  const updateShuttlecockType = (
    sessionId: string,
    index: number,
    updates: Partial<ShuttlecockType>
  ) => {
    const current = editStates[sessionId];
    if (!current) return;
    const updated = current.shuttlecockTypes.map((t, i) =>
      i === index ? { ...t, ...updates } : t
    );
    updateEdit(sessionId, { shuttlecockTypes: updated });
  };

  const addWalkIn = (sessionId: string) => {
    const current = editStates[sessionId];
    if (!current) return;
    updateEdit(sessionId, {
      walkInPlayers: [
        ...(current.walkInPlayers || []),
        { id: `w_${Date.now()}`, name: '', setsPlayed: 1 },
      ],
    });
  };

  const removeWalkIn = (sessionId: string, index: number) => {
    const current = editStates[sessionId];
    if (!current) return;
    updateEdit(sessionId, {
      walkInPlayers: (current.walkInPlayers || []).filter((_, i) => i !== index),
    });
  };

  const updateWalkIn = (
    sessionId: string,
    index: number,
    updates: Partial<WalkInPlayer>
  ) => {
    const current = editStates[sessionId];
    if (!current) return;
    const updated = (current.walkInPlayers || []).map((w, i) =>
      i === index ? { ...w, ...updates } : w
    );
    updateEdit(sessionId, { walkInPlayers: updated });
  };

  // Save cost details
  const handleSave = async (sessionId: string) => {
    const detail = editStates[sessionId];
    if (!detail) return;

    setSavingSession(sessionId);
    try {
      const res = await saveSessionCostDetails(detail);
      if (res.success) {
        toast.success('Đã lưu chi phí buổi đánh!');
        setCostDetails((prev) => ({ ...prev, [sessionId]: detail }));
        router.refresh();
      } else {
        toast.error(res.error || 'Lưu thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setSavingSession(null);
    }
  };

  // Payment actions
  const handleVerify = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      await verifyPayment(paymentId);
      toast.success('Đã xác nhận thanh toán');
      router.refresh();
    } catch {
      toast.error('Xác nhận thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      await rejectPayment(paymentId);
      toast.success('Đã từ chối thanh toán');
      router.refresh();
    } catch {
      toast.error('Từ chối thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  // Format week label
  const weekLabel = (() => {
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');
    return `${format(start, 'dd/MM', { locale: vi })} - ${format(end, 'dd/MM/yyyy', { locale: vi })}`;
  })();

  const isCurrentWeek = (() => {
    const now = new Date();
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return dateFrom === currentWeekStart;
  })();

  // Sessions that have passed or are today (for cost entry)
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            disabled={loadingWeek}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 flex-1 justify-center">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <div className="text-center">
              <p className="font-bold text-sm sm:text-base">{weekLabel}</p>
              {isCurrentWeek && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 mt-0.5">
                  Tuần hiện tại
                </Badge>
              )}
            </div>
            {loadingWeek && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="flex gap-1 shrink-0">
            {!isCurrentWeek && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('current')}
                disabled={loadingWeek}
                className="text-xs"
              >
                Hôm nay
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('next')}
              disabled={loadingWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {sessions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <CalendarOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1">Tuần này không có buổi đánh nào</h3>
          <p className="text-sm text-muted-foreground">
            Không tìm thấy lịch đánh cầu trong tuần {weekLabel}
          </p>
        </Card>
      )}

      {/* Session Cards */}
      {sessions.map((session) => {
        const edit = editStates[session.id];
        const savedDetail = costDetails[session.id];
        const totals = computeTotals(edit || null);
        const hasCostData = savedDetail && (
          savedDetail.courtHourlyRate > 0 ||
          savedDetail.shuttlecockTypes.length > 0 ||
          savedDetail.waterCost > 0
        );

        const attendees = session.registrations
          .filter((r) => r.status === 'ATTENDED')
          .map((r) => ({
            userId: r.user_id,
            name: r.profiles.full_name,
            setsPlayed: r.sets_played,
            avatar: r.profiles.avatar_url,
          }));

        const registeredNotAttended = session.registrations
          .filter((r) => r.status === 'REGISTERED' || r.status === 'NO_SHOW' || r.status === 'ABSENT');

        const playerCosts = computePlayerCosts(
          edit || null,
          attendees.map((a) => ({ userId: a.userId, name: a.name, setsPlayed: a.setsPlayed }))
        );

        const sessionPayments = payments.filter((p) => p.session_id === session.id);
        const isExpanded = expandedSession === session.id;
        const isPast = session.date <= today;
        const isFinalized = session.status === 'FINALIZED';

        return (
          <Card
            key={session.id}
            className={`overflow-hidden transition-all ${
              isExpanded ? 'ring-2 ring-emerald-500/30' : ''
            }`}
          >
            {/* Session Header */}
            <div
              className="p-4 sm:p-5 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedSession(isExpanded ? null : session.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        isFinalized
                          ? 'bg-emerald-100 text-emerald-700'
                          : isPast
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isFinalized ? 'Đã chốt' : isPast ? 'Đã đánh' : 'Sắp đánh'}
                    </Badge>
                    {hasCostData && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Đã nhập CP
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base mb-1">
                    {format(new Date(session.date + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                      {attendees.length} người tham gia
                      {(edit?.walkInPlayers?.length || 0) > 0 && (
                        <span className="text-amber-600">+{edit?.walkInPlayers?.length} khách</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {hasCostData ? (
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatVND(computeTotals(savedDetail).total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Tổng chi phí</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Chưa nhập</p>
                  )}
                </div>
              </div>

              {/* Attendee Avatars */}
              {attendees.length > 0 && (
                <div className="flex items-center gap-1 mt-3 -space-x-1.5">
                  {attendees.slice(0, 8).map((a) => {
                    const initials = a.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <Avatar key={a.userId} className="h-7 w-7 border-2 border-background">
                        <AvatarImage src={a.avatar || ''} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[9px] font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {attendees.length > 8 && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      +{attendees.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && edit && (
              <div className="border-t">
                {/* Attendees List */}
                <div className="p-4 sm:p-5 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Người tham gia ({attendees.length}
                    {(edit.walkInPlayers?.length || 0) > 0 && ` + ${edit.walkInPlayers?.length} khách`})
                  </h4>

                  <div className="space-y-2">
                    {attendees.map((a) => {
                      const initials = a.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div key={a.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.avatar || ''} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-sm font-medium truncate">{a.name}</span>
                          <Badge variant="secondary" className="text-xs">{a.setsPlayed} séc</Badge>
                        </div>
                      );
                    })}

                    {/* Walk-in Players */}
                    {(edit.walkInPlayers || []).map((w, i) => (
                      <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50">
                        <UserPlus className="h-4 w-4 text-amber-600 shrink-0" />
                        <Input
                          placeholder="Tên khách"
                          value={w.name}
                          onChange={(e) => updateWalkIn(session.id, i, { name: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={w.setsPlayed}
                          onChange={(e) => updateWalkIn(session.id, i, { setsPlayed: parseInt(e.target.value) || 0 })}
                          className="h-8 text-sm w-16 text-center"
                        />
                        <span className="text-xs text-muted-foreground">séc</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => removeWalkIn(session.id, i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {/* Registered but not attended */}
                    {registeredNotAttended.length > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-200/50">
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mb-1.5 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Đăng ký nhưng không tham gia ({registeredNotAttended.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {registeredNotAttended.map((r) => (
                            <Badge
                              key={r.id}
                              variant="secondary"
                              className="text-[10px] bg-red-100/60 text-red-600 line-through"
                            >
                              {r.profiles.full_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addWalkIn(session.id)}
                      className="w-full text-xs gap-1 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Thêm khách vãng lai (không đăng ký)
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Cost Input Form */}
                <div className="p-4 sm:p-5 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-emerald-600" />
                    Chi phí buổi đánh
                  </h4>

                  {/* Court Cost */}
                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/40 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                      <CourtSvgIcon className="w-5 h-5" />
                      Tiền sân
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Giá thuê / giờ (₫)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={edit.courtHourlyRate || ''}
                          onChange={(e) => updateEdit(session.id, { courtHourlyRate: parseInt(e.target.value) || 0 })}
                          placeholder="150,000"
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Số giờ đánh</Label>
                        <Input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={edit.courtHours || ''}
                          onChange={(e) => updateEdit(session.id, { courtHours: parseFloat(e.target.value) || 0 })}
                          className="mt-1 h-9"
                        />
                      </div>
                    </div>
                    {edit.courtHourlyRate > 0 && edit.courtHours > 0 && (
                      <p className="text-xs text-blue-700 dark:text-blue-400 font-medium bg-blue-100/60 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg">
                        {formatVND(edit.courtHourlyRate)}/giờ × {edit.courtHours} giờ = <strong>{formatVND(edit.courtHourlyRate * edit.courtHours)}</strong>
                      </p>
                    )}
                  </div>

                  {/* Shuttlecock Cost */}
                  <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300">
                        <ShuttlecockSvgIcon className="w-5 h-5" />
                        Tiền cầu
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 border-orange-300 text-orange-700"
                        onClick={() => addShuttlecockType(session.id)}
                      >
                        <Plus className="h-3 w-3" /> Thêm loại cầu
                      </Button>
                    </div>

                    {edit.shuttlecockTypes.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-2">
                        Chưa thêm loại cầu nào. Nhấn &quot;Thêm loại cầu&quot; để bắt đầu.
                      </p>
                    )}

                    {edit.shuttlecockTypes.map((st, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-card border space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Tên loại cầu (VD: Victor AS-30)"
                            value={st.name}
                            onChange={(e) => updateShuttlecockType(session.id, i, { name: e.target.value })}
                            className="h-8 text-sm flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 shrink-0"
                            onClick={() => removeShuttlecockType(session.id, i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Số quả</Label>
                            <Input
                              type="number"
                              min={1}
                              value={st.quantity || ''}
                              onChange={(e) => updateShuttlecockType(session.id, i, { quantity: parseInt(e.target.value) || 0 })}
                              className="h-8 text-sm mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Giá / quả (₫)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={st.pricePerUnit || ''}
                              onChange={(e) => updateShuttlecockType(session.id, i, { pricePerUnit: parseInt(e.target.value) || 0 })}
                              className="h-8 text-sm mt-0.5"
                            />
                          </div>
                        </div>
                        {st.quantity > 0 && st.pricePerUnit > 0 && (
                          <p className="text-[11px] text-orange-700 dark:text-orange-400 font-medium">
                            {st.name ? `${st.name}: ` : ''}{st.quantity} quả × {formatVND(st.pricePerUnit)} = <strong>{formatVND(st.quantity * st.pricePerUnit)}</strong>
                          </p>
                        )}
                      </div>
                    ))}

                    {edit.shuttlecockTypes.length > 0 && (
                      <p className="text-xs text-orange-700 dark:text-orange-400 font-medium bg-orange-100/60 dark:bg-orange-900/30 px-2.5 py-1.5 rounded-lg">
                        Tổng tiền cầu: <strong>{formatVND(edit.shuttlecockTypes.reduce((s, t) => s + t.quantity * t.pricePerUnit, 0))}</strong>
                      </p>
                    )}
                  </div>

                  {/* Water Cost */}
                  <div className="p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/10 border border-cyan-200/40 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 dark:text-cyan-300">
                      <DrinkSvgIcon className="w-5 h-5" />
                      Tiền nước / chi phí khác
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Tổng tiền nước (₫)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={edit.waterCost || ''}
                        onChange={(e) => updateEdit(session.id, { waterCost: parseInt(e.target.value) || 0 })}
                        placeholder="50,000"
                        className="mt-1 h-9"
                      />
                    </div>
                  </div>

                  {/* Total Summary */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CourtSvgIcon className="w-4 h-4" /> Sân:
                      </span>
                      <span className="font-semibold">{formatVND(totals.court)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ShuttlecockSvgIcon className="w-4 h-4" /> Cầu:
                      </span>
                      <span className="font-semibold">{formatVND(totals.shuttle)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <DrinkSvgIcon className="w-4 h-4" /> Nước:
                      </span>
                      <span className="font-semibold">{formatVND(totals.water)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <WalletMoneySvgIcon className="w-5 h-5" /> Tổng chi phí:
                      </span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVND(totals.total)}
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={() => handleSave(session.id)}
                    disabled={savingSession === session.id}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {savingSession === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Lưu chi phí buổi đánh
                  </Button>
                </div>

                {/* Player Cost Breakdown */}
                {totals.total > 0 && playerCosts.length > 0 && (
                  <>
                    <Separator />
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <WalletMoneySvgIcon className="w-4 h-4" />
                          Phân chia chi phí
                        </h4>
                        <Dialog
                          open={detailDialog === session.id}
                          onOpenChange={(open) => setDetailDialog(open ? session.id : null)}
                        >
                          <DialogTrigger className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent transition-colors">
                              <Eye className="h-3 w-3" /> Chi tiết
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                                <PieChart className="h-4 w-4 text-emerald-600" />
                                Chi tiết phân chia - {format(new Date(session.date + 'T00:00:00'), 'dd/MM/yyyy')}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-3 py-2">
                              {/* Session info */}
                              <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1">
                                <p><strong>Sân:</strong> {session.court_name}</p>
                                <p><strong>Giờ:</strong> {formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
                                <p><strong>Tổng chi phí:</strong> {formatVND(totals.total)}</p>
                              </div>

                              {/* Cost detail */}
                              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border text-xs space-y-1">
                                <p className="font-semibold text-blue-800 dark:text-blue-300">🏸 Tiền sân</p>
                                <p>{formatVND(edit.courtHourlyRate)}/giờ × {edit.courtHours} giờ = {formatVND(totals.court)}</p>
                              </div>

                              {edit.shuttlecockTypes.length > 0 && (
                                <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border text-xs space-y-1">
                                  <p className="font-semibold text-orange-800 dark:text-orange-300">🪶 Tiền cầu</p>
                                  {edit.shuttlecockTypes.map((st, i) => (
                                    <p key={i}>
                                      {st.name || `Loại ${i + 1}`}: {st.quantity} quả × {formatVND(st.pricePerUnit)} = {formatVND(st.quantity * st.pricePerUnit)}
                                    </p>
                                  ))}
                                  <p className="font-medium">Tổng: {formatVND(totals.shuttle)}</p>
                                </div>
                              )}

                              {totals.water > 0 && (
                                <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border text-xs">
                                  <p className="font-semibold text-cyan-800 dark:text-cyan-300">🥤 Tiền nước</p>
                                  <p>Tổng: {formatVND(totals.water)}</p>
                                </div>
                              )}

                              <Separator />

                              {/* Per player */}
                              <p className="font-semibold text-sm flex items-center gap-1">
                                <BadgeInfo className="h-4 w-4 text-emerald-600" />
                                Chia theo số séc mỗi người
                              </p>

                              {playerCosts.map((pc) => {
                                const totalSets = playerCosts.reduce((s, p) => s + p.setsPlayed, 0);
                                return (
                                  <div key={pc.userId} className="p-3 rounded-xl bg-muted/30 border text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-sm">{pc.name}</span>
                                      <Badge variant="secondary" className="text-[10px]">{pc.setsPlayed}/{totalSets} séc</Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                                      <span>Sân: {formatVND(pc.courtShare)}</span>
                                      <span>Cầu: {formatVND(pc.shuttleShare)}</span>
                                      <span>Nước: {formatVND(pc.waterShare)}</span>
                                    </div>
                                    <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                      Tổng: {formatVND(pc.totalShare)}
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
                      </div>

                      {/* Quick breakdown cards */}
                      <div className="grid gap-2">
                        {playerCosts.map((pc) => {
                          const sessionPayment = sessionPayments.find((p) =>
                            p.user_id === pc.userId
                          );
                          const isWalkIn = pc.userId.startsWith('walkin_');

                          return (
                            <div
                              key={pc.userId}
                              className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                                isWalkIn
                                  ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/50'
                                  : 'bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isWalkIn ? (
                                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <UserPlus className="h-4 w-4 text-amber-600" />
                                  </div>
                                ) : (
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                      {pc.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {pc.name}
                                    {isWalkIn && (
                                      <span className="text-[10px] text-amber-600 ml-1">(khách)</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {pc.setsPlayed} séc · Sân {formatVND(pc.courtShare)} · Cầu {formatVND(pc.shuttleShare)} · Nước {formatVND(pc.waterShare)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatVND(pc.totalShare)}
                                </p>
                                {sessionPayment && !isWalkIn && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge
                                      variant="secondary"
                                      className={`text-[9px] ${
                                        sessionPayment.status === 'VERIFIED'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : sessionPayment.status === 'PAID'
                                            ? 'bg-blue-100 text-blue-700'
                                            : sessionPayment.status === 'REJECTED'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {sessionPayment.status === 'VERIFIED' && 'Đã xác nhận'}
                                      {sessionPayment.status === 'PAID' && 'Chờ duyệt'}
                                      {sessionPayment.status === 'PENDING' && 'Chưa trả'}
                                      {sessionPayment.status === 'REJECTED' && 'Từ chối'}
                                    </Badge>
                                    {sessionPayment.status === 'PAID' && (
                                      <div className="flex gap-0.5">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5"
                                          onClick={() => handleVerify(sessionPayment.id)}
                                          disabled={actionLoading === sessionPayment.id}
                                        >
                                          {actionLoading === sessionPayment.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                          )}
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5"
                                          onClick={() => handleReject(sessionPayment.id)}
                                          disabled={actionLoading === sessionPayment.id}
                                        >
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
