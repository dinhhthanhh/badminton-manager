'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createClub, setActiveClubId, searchUsersToInvite, requestToJoinClub } from '@/services/club.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Club, Profile } from '@/types';
import {
  PlusCircle, Crown, Users, CheckCircle2, ArrowRight,
  Loader2, Search, UserPlus, ShieldCheck, AlertCircle, Building2, Clock, Send,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  clubs: Club[];
  publicClubs: Club[];
  pendingClubs: Club[];
  activeClubId: string | null;
  currentUserId: string;
}

export function ClubsListClient({ clubs, publicClubs, pendingClubs, activeClubId, currentUserId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'my' | 'explore'>('my');
  const [searchPublic, setSearchPublic] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [clubName, setClubName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  // User search for founding member
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email' | 'skill_level'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'> | null>(null);

  const handleSearchMember = async (queryStr: string) => {
    setMemberQuery(queryStr);
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsersToInvite(queryStr);
      setSearchResults(results);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const handleSwitchClub = async (clubId: string) => {
    setSwitching(clubId);
    try {
      await setActiveClubId(clubId);
      toast.success('Đã chuyển sang câu lạc bộ mới');
      router.refresh();
    } catch {
      toast.error('Chuyển CLB thất bại');
    } finally {
      setSwitching(null);
    }
  };

  const handleRequestJoin = async (clubId: string) => {
    setJoiningId(clubId);
    try {
      const res = await requestToJoinClub(clubId);
      if (res.success) {
        toast.success('Đã gửi yêu cầu tham gia! Vui lòng chờ Chủ CLB duyệt.');
        router.refresh();
      } else {
        toast.error(res.error || 'Gửi yêu cầu thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim()) {
      toast.error('Vui lòng nhập tên câu lạc bộ');
      return;
    }

    if (!selectedMember) {
      toast.error('Vui lòng mời ít nhất 1 thành viên khác để tạo nhóm 2 người!');
      return;
    }

    setLoading(true);
    try {
      const res = await createClub({
        name: clubName,
        description,
        invitedUserId: selectedMember.id,
      });

      if (res.success) {
        toast.success(`🎉 Chúc mừng! Bạn đã tạo CLB ${clubName} và trở thành Chủ CLB!`);
        setCreateDialogOpen(false);
        setClubName('');
        setDescription('');
        setSelectedMember(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Tạo CLB thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const myClubIds = clubs.map((c) => c.id);
  const pendingClubIds = pendingClubs.map((c) => c.id);

  const filteredPublicClubs = publicClubs.filter((c) =>
    c.name.toLowerCase().includes(searchPublic.toLowerCase()) ||
    c.description.toLowerCase().includes(searchPublic.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-5 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border-emerald-500/20 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 shrink-0">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-base">Hệ thống Câu Lạc Bộ (Multi-Club)</h3>
              <p className="text-xs text-muted-foreground">
                Tự tạo CLB riêng (cần 2 người), xin gia nhập CLB công khai hoặc tham gia nhiều CLB khác nhau
              </p>
            </div>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shrink-0">
              <PlusCircle className="h-4 w-4" />
              Tạo CLB Mới
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Tạo Câu Lạc Bộ Mới
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateClub} className="space-y-4 py-2 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Quy định tạo CLB:</strong> Bạn cần mời ít nhất <strong>1 thành viên khác</strong> để lập thành nhóm 2 người. Bạn sẽ trở thành <strong>Chủ CLB (Club Owner)</strong>!
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Tên Câu Lạc Bộ (*)</label>
                  <Input
                    placeholder="Ví dụ: CLB Cầu Lông Phong Trào Sài Gòn..."
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Mô tả CLB</label>
                  <Textarea
                    placeholder="Nhập tiêu chí hoạt động, lịch đánh cố định..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Mandatory 2nd Member Selection */}
                <div className="space-y-2 p-3 rounded-xl bg-muted/40 border">
                  <label className="font-semibold block flex items-center justify-between">
                    <span>Mời thành viên thứ 2 (Bắt buộc)</span>
                    {selectedMember && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                        ✓ Đã chọn
                      </Badge>
                    )}
                  </label>

                  {selectedMember ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={selectedMember.avatar_url || ''} />
                          <AvatarFallback className="bg-emerald-200 text-emerald-800 text-xs font-bold">
                            {selectedMember.full_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-xs">{selectedMember.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{selectedMember.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-red-500 h-7"
                        onClick={() => setSelectedMember(null)}
                      >
                        Đổi người
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm theo tên hoặc email thành viên..."
                          value={memberQuery}
                          onChange={(e) => handleSearchMember(e.target.value)}
                          className="pl-8 h-9 text-xs"
                        />
                      </div>

                      {searching && (
                        <p className="text-[11px] text-muted-foreground text-center py-1">Đang tìm...</p>
                      )}

                      {searchResults.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 bg-card border rounded-lg p-1">
                          {searchResults.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setSelectedMember(u);
                                setSearchResults([]);
                                setMemberQuery('');
                              }}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={u.avatar_url || ''} />
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                                    {u.full_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-xs">{u.full_name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" type="button" onClick={() => setCreateDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={loading || !selectedMember} className="bg-emerald-600 hover:bg-emerald-700">
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    Tạo CLB & Trở Thành Chủ CLB
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Tabs: My Clubs vs Explore Public Clubs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'my' | 'explore')}>
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="my">CLB Của Tôi ({clubs.length})</TabsTrigger>
          <TabsTrigger value="explore">Khám Phá & Xin Gia Nhập ({publicClubs.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: MY CLUBS */}
        <TabsContent value="my" className="mt-4 space-y-4">
          {clubs.length === 0 ? (
            <Card className="p-12 text-center">
              <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-1">Bạn chưa tham gia Câu Lạc Bộ nào</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                Hãy mời 1 người bạn để tạo CLB mới hoặc tìm kiếm CLB ở mục &quot;Khám phá & Xin gia nhập&quot;!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubs.map((club) => {
                const isActive = activeClubId === club.id || (clubs.length === 1 && !activeClubId);
                const isOwner = club.owner_id === currentUserId;

                return (
                  <Card
                    key={club.id}
                    className={`p-5 space-y-4 transition-all ${
                      isActive ? 'ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10' : 'hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-emerald-500/30">
                          <AvatarImage src={club.avatar_url || ''} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-800 text-base font-bold">
                            {club.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base sm:text-lg">{club.name}</h3>
                            {isActive && (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                ✓ CLB Đang Xem
                              </Badge>
                            )}
                          </div>
                          {isOwner && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Crown className="h-3.5 w-3.5 fill-amber-500" /> Bạn là Chủ CLB
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {club.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 italic">
                        &quot;{club.description}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t gap-2">
                      <Link href={`/clubs/${club.id}`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1">
                          <Users className="h-3.5 w-3.5 text-emerald-600" /> Xem Chi Tiết CLB
                        </Button>
                      </Link>

                      {!isActive && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSwitchClub(club.id)}
                          disabled={switching === club.id}
                          className="text-xs gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          {switching === club.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Chuyển Lịch Sang CLB Này
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: EXPLORE & JOIN PUBLIC CLUBS */}
        <TabsContent value="explore" className="mt-4 space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm CLB theo tên hoặc mô tả..."
                value={searchPublic}
                onChange={(e) => setSearchPublic(e.target.value)}
                className="pl-9"
              />
            </div>
          </Card>

          {filteredPublicClubs.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Không tìm thấy câu lạc bộ nào phù hợp.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPublicClubs.map((club) => {
                const isMember = myClubIds.includes(club.id);
                const isPending = pendingClubIds.includes(club.id);

                return (
                  <Card key={club.id} className="p-5 space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 ring-2 ring-emerald-500/20">
                          <AvatarImage src={club.avatar_url || ''} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-800 text-sm font-bold">
                            {club.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-base">{club.name}</h4>
                          {isMember && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                              ✓ Đã tham gia
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                              ⏳ Chờ Chủ CLB duyệt
                            </Badge>
                          )}
                        </div>
                      </div>

                      {club.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          &quot;{club.description}&quot;
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Link href={`/clubs/${club.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                          Xem chi tiết
                        </Button>
                      </Link>

                      {isMember ? (
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600">
                          Thành viên
                        </Badge>
                      ) : isPending ? (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Đã xin tham gia (Chờ duyệt)
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRequestJoin(club.id)}
                          disabled={joiningId === club.id}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        >
                          {joiningId === club.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Xin Gia Nhập CLB
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
