'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { formatVND } from '@/lib/utils/money';
import { formatDate, formatTime } from '@/lib/utils/date';
import { markPaymentAsPaid } from '@/services/payment.service';
import { submitCourtBill, getCourtBills, type CourtBillRecord } from '@/services/bill.service';
import { CourtSvgIcon, ShuttlecockSvgIcon, DrinkSvgIcon, WalletMoneySvgIcon } from '@/components/icons/custom-svg-icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { PaymentWithDetails } from '@/types';
import { CreditCard, CheckCircle2, Clock, XCircle, Loader2, PieChart, Info, PlusCircle, AlertCircle } from 'lucide-react';

interface Props {
  payments: PaymentWithDetails[];
}

export function PaymentsClient({ payments }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Form state for Submitting Court Bill
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [courtCost, setCourtCost] = useState('');
  const [shuttleCost, setShuttleCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [submittingBill, setSubmittingBill] = useState(false);

  const filtered = filter === 'ALL'
    ? payments
    : payments.filter((p) => p.status === filter);

  // Grand totals across all payments for breakdown
  const totalCourtShare = payments.reduce((sum, p) => sum + (p.court_share || 0), 0);
  const totalShuttleShare = payments.reduce((sum, p) => sum + (p.shuttlecock_share || 0), 0);
  const totalOtherShare = payments.reduce((sum, p) => sum + (p.other_share || 0), 0);
  const grandTotal = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const outstanding = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.total_amount, 0);

  const handleMarkPaid = async (paymentId: string) => {
    setLoading(paymentId);
    try {
      const result = await markPaymentAsPaid(paymentId);
      if (result.success) {
        toast.success('Đã xác nhận thanh toán');
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

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBill(true);

    try {
      const res = await submitCourtBill({
        date: billDate,
        courtCost: parseFloat(courtCost) || 0,
        shuttlecockCost: parseFloat(shuttleCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
        notes: billNotes,
      });

      if (res.success) {
        toast.success('Đã gửi hóa đơn tiền sân! Đang chờ Admin duyệt.');
        setSubmitDialogOpen(false);
        setCourtCost('');
        setShuttleCost('');
        setOtherCost('');
        setBillNotes('');
        router.refresh();
      } else {
        toast.error(res.error || 'Đăng tiền sân thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setSubmittingBill(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="h-3 w-3 mr-1" />Chờ thanh toán</Badge>;
      case 'PAID':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle2 className="h-3 w-3 mr-1" />Đã chuyển khoản</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" />Đã xác nhận</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Bị từ chối</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
              <h3 className="font-bold text-base">Tổng hợp Chi phí Tập luyện</h3>
              <p className="text-xs text-muted-foreground">Phân tích chi tiết tiền sân, tiền cầu và nước ngọt/khác bằng icon SVG</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Member Court Expense Submission Button */}
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md hover:scale-102">
                <PlusCircle className="h-4 w-4" />
                Đăng Tiền Sân
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <CourtSvgIcon className="w-6 h-6" />
                    Đăng Hóa Đơn Tiền Sân / Cầu / Nước
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmitBill} className="space-y-4 py-2">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Hệ thống sẽ tự động xác minh (Verify) ngày bạn chọn phải có buổi đánh cầu hợp lệ. Sau khi đăng, hóa đơn sẽ được chuyển cho Admin duyệt.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Ngày đánh cầu</label>
                    <Input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <CourtSvgIcon className="w-4 h-4" /> Tiền sân (₫)
                      </label>
                      <Input
                        type="number"
                        placeholder="150000"
                        value={courtCost}
                        onChange={(e) => setCourtCost(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <ShuttlecockSvgIcon className="w-4 h-4" /> Tiền cầu (₫)
                      </label>
                      <Input
                        type="number"
                        placeholder="50000"
                        value={shuttleCost}
                        onChange={(e) => setShuttleCost(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <DrinkSvgIcon className="w-4 h-4" /> Tiền nước (₫)
                      </label>
                      <Input
                        type="number"
                        placeholder="20000"
                        value={otherCost}
                        onChange={(e) => setOtherCost(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Ghi chú (Ví dụ: Tiền đặt sân 2 tiếng sân số 3)</label>
                    <Textarea
                      placeholder="Nhập ghi chú chi tiết hóa đơn..."
                      value={billNotes}
                      onChange={(e) => setBillNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button variant="outline" type="button" onClick={() => setSubmitDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button type="submit" disabled={submittingBill} className="bg-emerald-600 hover:bg-emerald-700">
                      {submittingBill && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      Gửi Admin Duyệt
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Summary Detail Dialog Trigger */}
            <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-background border border-input hover:bg-accent transition-colors">
                <Info className="h-4 w-4 text-emerald-600" />
                Xem Chi Tiết Tổng Hợp
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <PieChart className="h-5 w-5 text-emerald-600" />
                    Bảng Tổng hợp Chi tiết Chi phí
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="p-3.5 rounded-2xl bg-muted/60 space-y-2.5 text-xs border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <CourtSvgIcon className="w-5 h-5" /> Tiền sân:
                      </span>
                      <span className="font-bold text-foreground text-sm">{formatVND(totalCourtShare)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <ShuttlecockSvgIcon className="w-5 h-5" /> Tiền cầu:
                      </span>
                      <span className="font-bold text-foreground text-sm">{formatVND(totalShuttleShare)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium">
                        <DrinkSvgIcon className="w-5 h-5" /> Tiền nước & khác:
                      </span>
                      <span className="font-bold text-foreground text-sm">{formatVND(totalOtherShare)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex items-center justify-between text-base font-bold">
                      <span className="flex items-center gap-2">
                        <WalletMoneySvgIcon className="w-5 h-5" /> Tổng chi phí:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">{formatVND(grandTotal)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    *Chi phí được tính toán tự động dựa trên số buổi bạn tham gia và số séc đấu thực tế.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 4 Vector SVG Cost Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <CourtSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền sân</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalCourtShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <ShuttlecockSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền cầu</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalShuttleShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border shadow-2xs space-y-1.5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <DrinkSvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold">Tiền nước / khác</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{formatVND(totalOtherShare)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 col-span-2 sm:col-span-1 shadow-2xs">
            <div className="flex items-center gap-2">
              <WalletMoneySvgIcon className="w-6 h-6 shrink-0" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">Tổng chi phí</p>
            </div>
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatVND(grandTotal)}</p>
          </div>
        </div>
      </Card>

      {/* Outstanding Amount Warning */}
      {outstanding > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tổng tiền còn nợ cần thanh toán</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatVND(outstanding)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
          <TabsTrigger value="PENDING">Chờ thanh toán</TabsTrigger>
          <TabsTrigger value="PAID">Đã chuyển khoản</TabsTrigger>
          <TabsTrigger value="VERIFIED">Đã xác nhận</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payments List */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Chưa có khoản thanh toán nào</h3>
          <p className="text-sm text-muted-foreground">
            Không tìm thấy lịch sử thanh toán.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((payment) => (
            <Card key={payment.id} className="p-4 sm:p-5 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-sm sm:text-base">
                    {formatDate(payment.sessions.date)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(payment.sessions.start_time)} - {formatTime(payment.sessions.end_time)} · {payment.sessions.court_name}
                  </p>
                </div>
                {statusBadge(payment.status)}
              </div>

              {/* Itemized breakdown per session with vector SVG icons */}
              <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm p-3 rounded-xl bg-muted/40 mb-3 border">
                <div className="flex items-center gap-1.5">
                  <CourtSvgIcon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tiền sân</p>
                    <p className="font-semibold">{formatVND(payment.court_share)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShuttlecockSvgIcon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tiền cầu</p>
                    <p className="font-semibold">{formatVND(payment.shuttlecock_share)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <DrinkSvgIcon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tiền nước</p>
                    <p className="font-semibold">{formatVND(payment.other_share)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Tổng cộng:</span>{' '}
                  <span className="font-bold text-primary text-base sm:text-lg">{formatVND(payment.total_amount)}</span>
                </div>

                {payment.status === 'PENDING' && (
                  <Button
                    size="sm"
                    className="rounded-full text-xs px-4"
                    onClick={() => handleMarkPaid(payment.id)}
                    disabled={loading === payment.id}
                  >
                    {loading === payment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Tôi đã chuyển khoản
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
