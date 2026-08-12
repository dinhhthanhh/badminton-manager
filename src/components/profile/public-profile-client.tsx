'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SKILL_LEVEL_LABELS } from '@/lib/config';
import { rateUserWithSessionProof, type UserRatingSummary, type CoAttendedSession } from '@/services/rating.service';
import { formatVND } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import {
  Star, Trophy, Clock, ShieldCheck, AlertTriangle, CheckCircle2,
  Calendar, Loader2, Award, Heart, MessageSquare, ArrowLeft,
  FileCheck, ShieldAlert, BadgeCheck, Lock,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  currentUser: Profile;
  targetUser: Profile;
  stats: {
    totalSessions: number;
    attendedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    totalSetsPlayed: number;
    outstandingMoney: number;
  };
  ratingSummary: UserRatingSummary;
  coAttendedSessions: CoAttendedSession[];
}

export function PublicProfileClient({ currentUser, targetUser, stats, ratingSummary, coAttendedSessions }: Props) {
  const router = useRouter();
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // Form State
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    coAttendedSessions.length > 0 ? coAttendedSessions[0].sessionId : ''
  );
  const [proofNote, setProofNote] = useState('');
  const [stars, setStars] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [payment, setPayment] = useState(5);
  const [sportsmanship, setSportsmanship] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const isSelf = currentUser.id === targetUser.id;
  const initials = targetUser.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const skillInfo = SKILL_LEVEL_LABELS[targetUser.skill_level || 'INTERMEDIATE'] || SKILL_LEVEL_LABELS.INTERMEDIATE;

  const attendanceRate = stats.totalSessions > 0
    ? Math.round((stats.attendedSessions / stats.totalSessions) * 100)
    : 100;

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      toast.error('Vui lòng chọn buổi đánh mà bạn và người này đã cùng tham gia');
      return;
    }

    setLoading(true);
    try {
      const res = await rateUserWithSessionProof({
        targetUserId: targetUser.id,
        sessionId: selectedSessionId,
        proofNote: proofNote.trim(),
        stars,
        comment,
        categories: { punctuality, payment, sportsmanship },
      });

      if (res?.success) {
        toast.success('Đã gửi đánh giá thành công! Đang chờ Chủ CLB xác nhận minh chứng.');
        setRateDialogOpen(false);
        setComment('');
        setProofNote('');
        router.refresh();
      } else {
        toast.error(res?.error || 'Gửi đánh giá thất bại');
      }
    } catch (err: unknown) {
      console.error('[handleSubmitRating] error:', err);
      toast.error('Có thay đổi phiên bản. Vui lòng nhấn F5 làm mới trang và thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/explore/users"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại tìm kiếm người chơi
      </Link>

      {/* Header Banner & Profile Info */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border-emerald-500/20 shadow-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <Avatar className="h-24 w-24 ring-4 ring-emerald-500/30 shrink-0">
            <AvatarImage src={targetUser.avatar_url || ''} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold truncate">{targetUser.full_name}</h1>
              <Badge className={`${skillInfo.color} font-medium`}>
                🏸 {skillInfo.label}
              </Badge>
              {targetUser.role === 'CLUB_OWNER' && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                  👑 Chủ CLB
                </Badge>
              )}
            </div>

            {targetUser.bio && (
              <p className="text-xs sm:text-sm text-muted-foreground italic max-w-lg">
                &quot;{targetUser.bio}&quot;
              </p>
            )}

            {/* Reliability Badge */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border shadow-2xs text-xs font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>{ratingSummary.reliabilityLabel}</span>
                <span className="text-emerald-600 dark:text-emerald-400">({ratingSummary.reliabilityScore}%)</span>
              </div>

              <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{ratingSummary.averageStars}</span>
                <span className="text-muted-foreground font-normal">
                  ({ratingSummary.verifiedRatingsCount} đánh giá đã xác nhận)
                </span>
              </div>
            </div>
          </div>

          {!isSelf && (
            <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shrink-0">
                <Star className="h-4 w-4 fill-white" />
                Đánh giá uy tín
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                    Đánh giá uy tín cho {targetUser.full_name}
                  </DialogTitle>
                </DialogHeader>

                {coAttendedSessions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 text-xs text-red-800 dark:text-red-300 space-y-2 text-center">
                    <Lock className="h-8 w-8 mx-auto text-red-600" />
                    <p className="font-bold text-sm">KHÔNG THỂ ĐÁNH GIÁ NGUYÊN TẮC</p>
                    <p>
                      Bạn và <strong>{targetUser.full_name}</strong> CHƯA TỪNG cùng tham gia buổi tập cầu lông nào trong hệ thống.
                    </p>
                    <div className="p-2.5 rounded-lg bg-card border text-[11px] text-muted-foreground text-left space-y-1">
                      <p className="font-semibold text-foreground">💡 Quy định đánh giá uy tín:</p>
                      <p>• Để chống đánh giá ảo/bừa bãi, bạn chỉ được phép đánh giá khi hai bạn đã cùng tham gia buổi tập.</p>
                      <p>• Đánh giá sẽ được gửi tới Chủ CLB xác nhận minh chứng trước khi có hiệu lực.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setRateDialogOpen(false)} className="mt-2 text-xs">
                      Đóng
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitRating} className="space-y-4 py-2 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>
                        Xác nhận: Bạn và <strong>{targetUser.full_name}</strong> đã cùng tham gia <strong>{coAttendedSessions.length} buổi đánh</strong> trong hệ thống.
                      </span>
                    </div>

                    {/* Mandatory Session Selection */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border">
                      <label className="font-semibold text-foreground block flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        1. Chọn Buổi Tập Cùng Tham Gia (*)
                      </label>
                      <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {coAttendedSessions.map((s) => (
                          <option key={s.sessionId} value={s.sessionId}>
                            Buổi ngày {formatDate(s.date)} ({s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}) - Sân {s.courtName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Proof Note */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">2. Ghi chú minh chứng buổi hôm đó</label>
                      <Input
                        placeholder="Ví dụ: Đánh cùng séc đôi nam, Sân 2 lúc 19h30..."
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                      />
                    </div>

                    {/* Stars Rating */}
                    <div className="space-y-1 text-center bg-muted/30 p-3 rounded-xl border">
                      <label className="font-semibold block">3. Đánh giá chung (Sao)</label>
                      <div className="flex items-center justify-center gap-1.5 my-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setStars(s)}
                            className="p-1 hover:scale-125 transition-transform"
                          >
                            <Star className={`h-7 w-7 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Criteria Category Breakdown */}
                    <div className="space-y-3 p-3 rounded-xl bg-card border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">Đúng giờ (Không sủi/trễ):</span>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={punctuality}
                          onChange={(e) => setPunctuality(parseInt(e.target.value) || 5)}
                          className="w-16 h-8 text-center text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">Thanh toán sòng phẳng:</span>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={payment}
                          onChange={(e) => setPayment(parseInt(e.target.value) || 5)}
                          className="w-16 h-8 text-center text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">Tinh thần thể thao / Vui vẻ:</span>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={sportsmanship}
                          onChange={(e) => setSportsmanship(parseInt(e.target.value) || 5)}
                          className="w-16 h-8 text-center text-xs"
                        />
                      </div>
                    </div>

                    {/* Detailed Comment */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">4. Nhận xét chi tiết</label>
                      <Textarea
                        placeholder="Viết nhận xét của bạn về thành viên này..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                      <span>
                        <strong>Lưu ý xác thực:</strong> Đánh giá của bạn sẽ được gửi tới <strong>Chủ CLB</strong> để xác nhận minh chứng trước khi được tính vào Điểm Uy Tín chính thức.
                      </span>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button variant="outline" type="button" onClick={() => setRateDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Gửi Đánh Giá Chờ Chủ CLB Duyệt
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>

      {/* Play Preferences Card */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" />
          Thông tin tập luyện & Khung giờ
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
            <p className="text-muted-foreground font-medium flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Tần suất đánh cầu:
            </p>
            <p className="font-bold text-foreground text-sm">
              {targetUser.play_frequency || 'Chưa cập nhật'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
            <p className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" /> Khung giờ thường tham gia:
            </p>
            <p className="font-bold text-foreground text-sm">
              {(targetUser.preferred_time_slots && targetUser.preferred_time_slots.length > 0)
                ? targetUser.preferred_time_slots.join(' · ')
                : 'Tối T2, T4, T6 (18:00 - 21:00)'}
            </p>
          </div>
        </div>
      </Card>

      {/* Attendance & Reliability Statistics */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-emerald-600" />
          Thống kê Uy tín & Tham gia
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/40">
            <p className="text-[11px] text-muted-foreground font-medium">Tỉ lệ tham gia</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{attendanceRate}%</p>
            <p className="text-[10px] text-muted-foreground">{stats.attendedSessions}/{stats.totalSessions} buổi</p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40">
            <p className="text-[11px] text-muted-foreground font-medium">Số séc đã đánh</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.totalSetsPlayed}</p>
            <p className="text-[10px] text-muted-foreground">séc đấu</p>
          </div>

          <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/40">
            <p className="text-[11px] text-muted-foreground font-medium">Số buổi sủi/vắng</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.noShowSessions}</p>
            <p className="text-[10px] text-muted-foreground">buổi sủi</p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40">
            <p className="text-[11px] text-muted-foreground font-medium">Nợ tiền chưa trả</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
              {stats.outstandingMoney > 0 ? formatVND(stats.outstandingMoney) : 'Không nợ'}
            </p>
            <p className="text-[10px] text-muted-foreground">tiền sân</p>
          </div>
        </div>
      </Card>

      {/* Ratings & Reviews List */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Đánh giá từ cộng đồng ({ratingSummary.totalRatings})
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {ratingSummary.verifiedRatingsCount} đã xác nhận · {ratingSummary.pendingRatingsCount} chờ xác nhận
          </Badge>
        </div>

        {ratingSummary.ratings.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            Chưa có đánh giá nào. Chỉ các thành viên từng tham gia cùng buổi đánh mới có thể gửi đánh giá!
          </p>
        ) : (
          <div className="space-y-3">
            {ratingSummary.ratings.map((r) => {
              const raterInitials = r.rater?.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';

              const isVerified = r.status === 'VERIFIED';

              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-xl border space-y-2 text-xs transition-all ${isVerified ? 'bg-muted/30 border-emerald-200/60' : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={r.rater?.avatar_url || ''} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {raterInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold text-sm">{r.rater?.full_name}</span>
                        {r.session && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            Buổi ngày {formatDate(r.session.date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>

                      {isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] gap-1">
                          <BadgeCheck className="h-3 w-3 text-emerald-600" /> Đã được Chủ CLB xác nhận
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[9px] gap-1">
                          ⏳ Chờ Chủ CLB xác nhận
                        </Badge>
                      )}
                    </div>
                  </div>

                  {r.proof_note && (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg font-medium">
                      📌 Minh chứng: {r.proof_note}
                    </p>
                  )}

                  {r.comment && <p className="text-muted-foreground italic">&quot;{r.comment}&quot;</p>}

                  {r.categories && (
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-1 border-t">
                      {r.categories.punctuality && <span>Đúng giờ: ⭐{r.categories.punctuality}</span>}
                      {r.categories.payment && <span>Thanh toán: ⭐{r.categories.payment}</span>}
                      {r.categories.sportsmanship && <span>Vui vẻ: ⭐{r.categories.sportsmanship}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
