'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime } from '@/lib/utils/date';
import { formatVND } from '@/lib/utils/money';
import { updateAttendance, updateSetsPlayed } from '@/services/registration.service';
import { upsertSessionCosts, finalizeSession, reopenSession } from '@/services/session.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { SessionWithDetails } from '@/types';
import {
  CalendarDays, Clock, MapPin, Users, ArrowLeft,
  CheckCircle2, XCircle, Minus, Plus,
  Calculator, Lock, Unlock, Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  session: SessionWithDetails;
}

export function AdminSessionDetailClient({ session }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [courtCost, setCourtCost] = useState(session.session_costs?.court_cost?.toString() || '0');
  const [shuttleCost, setShuttleCost] = useState(session.session_costs?.shuttlecock_cost?.toString() || '0');
  const [otherCost, setOtherCost] = useState(session.session_costs?.other_cost?.toString() || '0');

  const activeRegs = session.registrations.filter((r) => r.status !== 'CANCELLED');
  const isFinalized = session.status === 'FINALIZED';

  const handleAttendance = async (regId: string, status: 'ATTENDED' | 'ABSENT' | 'NO_SHOW') => {
    try {
      await updateAttendance(regId, status);
      toast.success('Đã điểm danh');
      router.refresh();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const handleSets = async (regId: string, sets: number) => {
    if (sets < 0) return;
    try {
      await updateSetsPlayed(regId, sets);
      router.refresh();
    } catch {
      toast.error('Cập nhật set thất bại');
    }
  };

  const handleSaveCosts = async () => {
    setLoading(true);
    try {
      await upsertSessionCosts(
        session.id,
        parseInt(courtCost) || 0,
        parseInt(shuttleCost) || 0,
        parseInt(otherCost) || 0,
      );
      toast.success('Đã lưu chi phí buổi tập');
      router.refresh();
    } catch {
      toast.error('Lưu chi phí thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Bạn có chắc muốn chốt chi phí buổi tập này? Hệ thống sẽ tự động tính tiền cho từng thành viên và tạo khoản cần thanh toán.')) return;
    setLoading(true);
    try {
      await finalizeSession(session.id);
      toast.success('Đã chốt chi phí buổi tập thành công!');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Chốt chi phí thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Mở lại buổi tập này? Việc này sẽ cho phép chỉnh sửa điểm danh và chi phí.')) return;
    setLoading(true);
    try {
      await reopenSession(session.id);
      toast.success('Đã mở lại buổi tập');
      router.refresh();
    } catch {
      toast.error('Mở lại thất bại');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = (parseInt(courtCost) || 0) + (parseInt(shuttleCost) || 0) + (parseInt(otherCost) || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={isFinalized ? 'default' : 'secondary'}>
            {isFinalized ? 'Đã chốt chi phí' : session.status}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold mb-4">Chi tiết Buổi tập Cầu lông</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span>{formatDate(session.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{session.court_name}</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4 inline mr-1" />
          {session.registration_count} người đăng ký · {session.attended_count} người tham gia
        </div>
      </Card>

      {/* Players & Attendance */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Điểm danh & Số set đã đánh
        </h2>

        {activeRegs.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Chưa có ai đăng ký.</p>
        ) : (
          <div className="space-y-3">
            {activeRegs.map((reg) => {
              const initials = reg.profiles.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={reg.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={reg.profiles.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{reg.profiles.full_name}</p>
                  </div>

                  {/* Attendance buttons */}
                  {!isFinalized && (
                    <div className="flex gap-1">
                      <Button
                        size="icon" variant={reg.status === 'ATTENDED' ? 'default' : 'outline'}
                        className="h-8 w-8" onClick={() => handleAttendance(reg.id, 'ATTENDED')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant={reg.status === 'ABSENT' ? 'destructive' : 'outline'}
                        className="h-8 w-8" onClick={() => handleAttendance(reg.id, 'ABSENT')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {isFinalized && (
                    <Badge variant="secondary" className={reg.status === 'ATTENDED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {reg.status === 'ATTENDED' ? 'Đã tham gia' : 'Vắng mặt'}
                    </Badge>
                  )}

                  {/* Sets */}
                  <div className="flex items-center gap-1">
                    {!isFinalized && (
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => handleSets(reg.id, Math.max(0, reg.sets_played - 1))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                    <span className="w-8 text-center text-sm font-medium">{reg.sets_played}</span>
                    {!isFinalized && (
                      <Button size="icon" variant="outline" className="h-7 w-7"
                        onClick={() => handleSets(reg.id, reg.sets_played + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">set</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Costs */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Chi phí buổi tập
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs">Tiền thuê sân (VND)</Label>
            <Input
              type="number" value={courtCost} onChange={(e) => setCourtCost(e.target.value)}
              disabled={isFinalized} className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Tiền cầu (VND)</Label>
            <Input
              type="number" value={shuttleCost} onChange={(e) => setShuttleCost(e.target.value)}
              disabled={isFinalized} className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Chi phí khác (VND)</Label>
            <Input
              type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)}
              disabled={isFinalized} className="mt-1"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Tổng chi phí</span>
          <span className="text-xl font-bold text-primary">{formatVND(totalCost)}</span>
        </div>

        {!isFinalized && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveCosts} disabled={loading}>
              Lưu chi phí
            </Button>
            <Button onClick={handleFinalize} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Lock className="h-4 w-4" />
              Chốt chi phí buổi tập
            </Button>
          </div>
        )}

        {isFinalized && (
          <Button variant="outline" onClick={handleReopen} disabled={loading} className="gap-2">
            <Unlock className="h-4 w-4" />
            Mở lại buổi tập
          </Button>
        )}
      </Card>
    </div>
  );
}
