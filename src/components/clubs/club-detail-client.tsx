'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { inviteUserToClub, searchUsersToInvite, setActiveClubId } from '@/services/club.service';
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Club, ClubMember, Profile, Rating } from '@/types';
import {
  Crown, Users, UserPlus, Search, ArrowLeft,
  CheckCircle2, ShieldCheck, UserCheck, Loader2, Star, ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  club: Club;
  members: ClubMember[];
  pendingRatings?: Rating[];
  currentUserId: string;
}

export function ClubDetailClient({ club, members, pendingRatings = [], currentUserId }: Props) {
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email' | 'skill_level'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const isOwner = club.owner_id === currentUserId;

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsersToInvite(val, club.id);
      setSearchResults(results);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId: string) => {
    setInvitingId(userId);
    try {
      const res = await inviteUserToClub(club.id, userId);
      if (res.success) {
        toast.success('Đã thêm thành viên vào câu lạc bộ!');
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        router.refresh();
      } else {
        toast.error(res.error || 'Thêm thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setInvitingId(null);
    }
  };

  const approvedMembers = members.filter((m) => m.status === 'APPROVED');
  const pendingMembers = members.filter((m) => m.status === 'PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { approveClubMember } = await import('@/services/club.service');
      const res = await approveClubMember(club.id, userId);
      if (res.success) {
        toast.success('Đã duyệt thành viên vào CLB!');
        router.refresh();
      } else {
        toast.error(res.error || 'Duyệt thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { rejectClubMember } = await import('@/services/club.service');
      const res = await rejectClubMember(club.id, userId);
      if (res.success) {
        toast.success('Đã từ chối yêu cầu');
        router.refresh();
      } else {
        toast.error(res.error || 'Từ chối thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRating = async (ratingId: string) => {
    setActionLoading(ratingId);
    try {
      const { confirmRatingByOwner } = await import('@/services/rating.service');
      const res = await confirmRatingByOwner(ratingId);
      if (res.success) {
        toast.success('Đã xác nhận minh chứng đánh giá!');
        router.refresh();
      } else {
        toast.error(res.error || 'Xác nhận thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRating = async (ratingId: string) => {
    setActionLoading(ratingId);
    try {
      const { rejectRatingByOwner } = await import('@/services/rating.service');
      const res = await rejectRatingByOwner(ratingId);
      if (res.success) {
        toast.success('Đã từ chối bài đánh giá');
        router.refresh();
      } else {
        toast.error(res.error || 'Từ chối thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetCurrentClub = async () => {
    await setActiveClubId(club.id);
    toast.success(`Đã chọn CLB ${club.name} làm CLB đang xem`);
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/clubs"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách CLB
      </Link>

      {/* Header Banner */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border-emerald-500/20 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-emerald-500/30 shrink-0">
              <AvatarImage src={club.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-2xl font-bold">
                {club.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold">{club.name}</h1>
                {isOwner && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-semibold">
                    👑 Chủ CLB
                  </Badge>
                )}
              </div>
              {club.description && (
                <p className="text-xs sm:text-sm text-muted-foreground italic max-w-lg">
                  &quot;{club.description}&quot;
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                <Users className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
                {members.length} thành viên tham gia
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetCurrentClub}
              className="text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Chọn Làm CLB Đang Xem
            </Button>

            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs">
                <UserPlus className="h-4 w-4" />
                Mời Thành Viên
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    <UserPlus className="h-5 w-5 text-emerald-600" />
                    Mời thành viên vào CLB {club.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 py-2 text-xs sm:text-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo tên hoặc email người chơi..."
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {searching && (
                    <p className="text-xs text-muted-foreground text-center py-2">Đang tìm kiếm...</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {searchResults.map((u) => {
                        const skillInfo = SKILL_LEVEL_LABELS[u.skill_level as SkillLevel || 'INTERMEDIATE'];
                        return (
                          <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={u.avatar_url || ''} />
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                                  {u.full_name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs truncate">{u.full_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleInvite(u.id)}
                              disabled={invitingId === u.id}
                              className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 gap-1 shrink-0"
                            >
                              {invitingId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                              Mời
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Đóng
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Pending Join Requests Section for Club Owner */}
      {isOwner && pendingMembers.length > 0 && (
        <Card className="p-5 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              Yêu cầu xin gia nhập đang chờ duyệt ({pendingMembers.length})
            </h3>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">
              Chờ bạn duyệt
            </Badge>
          </div>

          <div className="space-y-2">
            {pendingMembers.map((m) => {
              const p = m.profiles;
              if (!p) return null;
              const initials = p.full_name.slice(0, 2).toUpperCase();

              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-card border shadow-2xs">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url || ''} />
                      <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">{p.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(p.id)}
                      disabled={actionLoading === p.id}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                    >
                      {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(p.id)}
                      disabled={actionLoading === p.id}
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pending Rating Reviews Section for Club Owner */}
      {isOwner && pendingRatings.length > 0 && (
        <Card className="p-5 border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              Đánh giá uy tín chờ Chủ CLB xác nhận minh chứng ({pendingRatings.length})
            </h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
              Chống đánh giá ảo
            </Badge>
          </div>

          <div className="space-y-2">
            {pendingRatings.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-card border shadow-2xs space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm">{r.rater?.full_name}</span>
                    <span className="text-muted-foreground"> đánh giá cho thành viên </span>
                    <Link href={`/explore/users/${r.rated_user_id}`} className="font-bold underline text-emerald-600">
                      xem hồ sơ
                    </Link>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="h-4 w-4 fill-amber-400" />
                    <span>{r.stars} sao</span>
                  </div>
                </div>

                {r.proof_note && (
                  <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    📌 Minh chứng buổi đánh: {r.proof_note}
                  </p>
                )}

                {r.comment && <p className="italic text-muted-foreground">&quot;{r.comment}&quot;</p>}

                <div className="flex items-center justify-end gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleConfirmRating(r.id)}
                    disabled={actionLoading === r.id}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                  >
                    {actionLoading === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Xác Nhận Minh Chứng
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRating(r.id)}
                    disabled={actionLoading === r.id}
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Từ Chối (Đánh giá ảo)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Roster Table */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Danh sách thành viên CLB ({approvedMembers.length})
        </h3>

        <div className="space-y-2">
          {approvedMembers.map((m) => {
            const profile = m.profiles;
            if (!profile) return null;

            const initials = profile.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const isClubOwner = m.role === 'OWNER';
            const skillInfo = SKILL_LEVEL_LABELS[profile.skill_level as SkillLevel || 'INTERMEDIATE'];

            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">{profile.full_name}</p>
                      {isClubOwner && (
                        <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-800">
                          👑 Chủ CLB
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={`${skillInfo?.color || ''} text-[10px] hidden sm:inline-flex`}>
                    {skillInfo?.label || 'Phong trào'}
                  </Badge>

                  <Link href={`/explore/users/${profile.id}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Profile
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
