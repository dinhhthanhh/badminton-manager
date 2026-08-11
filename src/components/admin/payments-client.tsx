'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatVND } from '@/lib/utils/money';
import { formatDate, formatTime } from '@/lib/utils/date';
import { verifyPayment, rejectPayment } from '@/services/payment.service';
import { getCourtBills, approveCourtBill, rejectCourtBill, type CourtBillRecord } from '@/services/bill.service';
import { CourtSvgIcon, ShuttlecockSvgIcon, DrinkSvgIcon, WalletMoneySvgIcon } from '@/components/icons/custom-svg-icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { PaymentWithDetails } from '@/types';
import { CheckCircle2, XCircle, CreditCard, Loader2, PieChart, Info, FileText, Clock } from 'lucide-react';

interface Props {
  payments: PaymentWithDetails[];
}

export function AdminPaymentsClient({ payments }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState('PAID');
  const [loading, setLoading] = useState<string | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  // Court bills state
  const [courtBills, setCourtBills] = useState<CourtBillRecord[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  const loadBills = async () => {
    setLoadingBills(true);
    try {
      const data = await getCourtBills();
      setCourtBills(data);
    } catch {
      // silent
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const filtered = filter === 'ALL' ? payments : payments.filter((p) => p.status === filter);

  // Grand totals across all payments for admin breakdown
  const totalCourtShare = payments.reduce((sum, p) => sum + (p.court_share || 0), 0);
  const totalShuttleShare = payments.reduce((sum, p) => sum + (p.shuttlecock_share || 0), 0);
  const totalOtherShare = payments.reduce((sum, p) => sum + (p.other_share || 0), 0);
  const grandTotal = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const handleVerify = async (paymentId: string) => {
    setLoading(paymentId);
    try {
      await verifyPayment(paymentId);
      toast.success('Đã xác nhận thanh toán');
      router.refresh();
    } catch { toast.error('Xác nhận thất bại'); }
    finally { setLoading(null); }
  };

  const handleReject = async (paymentId: string) => {
    setLoading(paymentId);
    try {
      await rejectPayment(paymentId);
      toast.success('Đã từ chối thanh toán');
      router.refresh();
    } catch { toast.error('Từ chối thất bại'); }
    finally { setLoading(null); }
  };

  const handleApproveBill = async (billId: string) => {
    setLoading(billId);
    try {
      const res = await approveCourtBill(billId);
      if (res.success) {
        toast.success('Đã duyệt hóa đơn tiền sân do thành viên gửi!');
        loadBills();
        router.refresh();
      } else {
        toast.error(res.error || 'Duyệt thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(null);
    }
  };

  const handleRejectBill = async (billId: string) => {
    setLoading(billId);
    try {
      const res = await rejectCourtBill(billId);
      if (res.success) {
        toast.success('Đã từ chối hóa đơn tiền sân');
        loadBills();
        router.refresh();
      } else {
        toast.error(res.error || 'Từ chối thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(null);
    }
  };

  const statusMap: Record<string, { label: string; style: string }> = {
    PENDING: { label: 'Chờ thanh toán', style: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Chờ duyệt', style: 'bg-blue-100 text-blue-700' },
    VERIFIED: { label: 'Đã xác nhận', style: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Bị từ chối', style: 'bg-red-100 text-red-700' },
  };

  const pendingBills = courtBills.filter((b) => b.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Cost Summary Breakdown Header Card with Vector SVG Icons */}
      <Card className="p-5 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border-emerald-500/20 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 shrink-0">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Tổng hợp Chi phí Câu lạc bộ</h3>
              <p className="text-xs text-muted-foreground">Thống kê tiền sân, tiền cầu và nước ngọt/khác bằng icon SVG</p>
            </div>
          </div>

          <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
            <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs">
              <Info className="h-4 w-4" />
              Xem chi tiết tổng hợp
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <PieChart className="h-5 w-5 text-emerald-600" />
                  Bảng Tổng hợp Chi phí CLB (Admin)
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="p-3.5 rounded-2xl bg-muted/60 space-y-2.5 text-xs border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <CourtSvgIcon className="w-5 h-5" /> Tổng tiền sân:
                    </span>
                    <span className="font-bold text-foreground text-sm">{formatVND(totalCourtShare)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <ShuttlecockSvgIcon className="w-5 h-5" /> Tổng tiền cầu:
                    </span>
                    <span className="font-bold text-foreground text-sm">{formatVND(totalShuttleShare)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium">
                      <DrinkSvgIcon className="w-5 h-5" /> Tổng tiền nước & khác:
                    </span>
                    <span className="font-bold text-foreground text-sm">{formatVND(totalOtherShare)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex items-center justify-between text-base font-bold">
                    <span className="flex items-center gap-2">
                      <WalletMoneySvgIcon className="w-5 h-5" /> Tổng tiền thu:
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatVND(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 4 Vector SVG Cost Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <CourtSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền sân</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalCourtShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <ShuttlecockSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền cầu</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalShuttleShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <DrinkSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền nước / khác</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalOtherShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 col-span-2 sm:col-span-1 shadow-2xs">
            <div className="flex items-center gap-2">
              <WalletMoneySvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">Tổng cộng</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatVND(grandTotal)}</p>
          </div>
        </div>
      </Card>

      {/* Member Submitted Bills Review Section */}
      {courtBills.length > 0 && (
        <Card className="p-5 border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                Đơn Tiền Sân Do Thành Viên Đăng ({pendingBills.length} chờ duyệt)
              </h3>
            </div>
            <Badge variant="secondary" className="text-xs">Xác minh tự động</Badge>
          </div>

          <div className="space-y-3">
            {courtBills.map((bill) => (
              <Card key={bill.id} className="p-4 bg-card border shadow-2xs">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={bill.submitter_avatar} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                        {bill.submitter_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">{bill.submitter_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Buổi ngày {formatDate(bill.date)} ({bill.session_info || 'Đã xác thực'})
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      bill.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : bill.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {bill.status === 'APPROVED' ? 'Đã duyệt' : bill.status === 'REJECTED' ? 'Bị từ chối' : 'Chờ Admin duyệt'}
                  </Badge>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-xs p-2.5 rounded-xl bg-muted/40 my-2 border">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Sân: </span>
                    <span className="font-bold">{formatVND(bill.court_cost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Cầu: </span>
                    <span className="font-bold">{formatVND(bill.shuttlecock_cost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Nước: </span>
                    <span className="font-bold">{formatVND(bill.other_cost)}</span>
                  </div>
                </div>

                {bill.notes && (
                  <p className="text-xs text-muted-foreground mb-2 italic">Ghi chú: "{bill.notes}"</p>
                )}

                {bill.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleApproveBill(bill.id)}
                      disabled={loading === bill.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs h-8 gap-1"
                    >
                      {loading === bill.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Duyệt Hóa Đơn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectBill(bill.id)}
                      disabled={loading === bill.id}
                      className="text-xs h-8 gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Từ Chối
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="PAID">Chờ duyệt</TabsTrigger>
          <TabsTrigger value="PENDING">Chờ chuyển khoản</TabsTrigger>
          <TabsTrigger value="VERIFIED">Đã xác nhận</TabsTrigger>
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Không tìm thấy khoản thanh toán nào.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => {
            const initials = payment.profiles.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const statusInfo = statusMap[payment.status] || { label: payment.status, style: '' };
            return (
              <Card key={payment.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={payment.profiles.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{payment.profiles.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.sessions.date)} · {formatTime(payment.sessions.start_time)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{formatVND(payment.total_amount)}</p>
                    <Badge variant="secondary" className={`text-[10px] mt-1 ${statusInfo.style}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Detailed Share Breakdown with vector SVG icons */}
                <div className="grid grid-cols-3 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 mb-3 border">
                  <div className="flex items-center gap-1">
                    <CourtSvgIcon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Sân: </span>
                      <span className="font-medium">{formatVND(payment.court_share)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShuttlecockSvgIcon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Cầu: </span>
                      <span className="font-medium">{formatVND(payment.shuttlecock_share)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DrinkSvgIcon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Nước: </span>
                      <span className="font-medium">{formatVND(payment.other_share)}</span>
                    </div>
                  </div>
                </div>

                {payment.status === 'PAID' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleVerify(payment.id)} disabled={loading === payment.id} className="flex-1 gap-1">
                      {loading === payment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Xác nhận
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(payment.id)} disabled={loading === payment.id} className="gap-1">
                      <XCircle className="h-3 w-3" /> Từ chối
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
