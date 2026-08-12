'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/date';
import { formatVND } from '@/lib/utils/money';
import { updateUserProfile } from '@/services/user.service';
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import { Mail, Calendar, Shield, Edit3, Loader2, CalendarDays, CreditCard, TrendingUp, Trophy, Clock, FileText, UserCheck } from 'lucide-react';
import Link from 'next/link';

interface Props {
  profile: Profile;
  upcomingCount: number;
  outstandingAmount: number;
  attendedCount: number;
}

export function ProfileClient({ profile, upcomingCount, outstandingAmount, attendedCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skill_level || 'INTERMEDIATE');
  const [playFrequency, setPlayFrequency] = useState(profile.play_frequency || '2-3 buổi / tuần');
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string>(
    (profile.preferred_time_slots || ['Tối T2, T4, T6 (18:00 - 21:00)']).join(', ')
  );
  const [bio, setBio] = useState(profile.bio || '');
  const [loading, setLoading] = useState(false);

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      toast.error('Tên hiển thị không được để trống');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(fullName, {
        skillLevel,
        playFrequency,
        preferredTimeSlots: preferredTimeSlots.split(',').map((s) => s.trim()).filter(Boolean),
        bio,
      });
      toast.success('Đã cập nhật hồ sơ cá nhân!');
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const currentSkillInfo = SKILL_LEVEL_LABELS[profile.skill_level || 'INTERMEDIATE'] || SKILL_LEVEL_LABELS.INTERMEDIATE;

  const stats = [
    {
      label: 'Sắp diễn ra',
      value: `${upcomingCount} buổi`,
      icon: CalendarDays,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      label: 'Cần thanh toán',
      value: `${formatVND(outstandingAmount)}`,
      icon: CreditCard,
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      label: 'Buổi đã tham gia',
      value: `${attendedCount} buổi`,
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1>
        <div className="flex items-center gap-2">
          <Link href={`/explore/users/${profile.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Xem Profile công khai
            </Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
              <Edit3 className="h-4 w-4" />
              Chỉnh sửa Profile
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa Hồ sơ cá nhân</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Tên hiển thị</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập tên đầy đủ..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Trình độ đánh cầu</label>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(SKILL_LEVEL_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Tần suất đánh cầu</label>
                  <Input
                    value={playFrequency}
                    onChange={(e) => setPlayFrequency(e.target.value)}
                    placeholder="Ví dụ: 3 buổi/tuần, Cuối tuần..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Khung giờ thường đánh (phân cách bằng dấu phẩy)</label>
                  <Input
                    value={preferredTimeSlots}
                    onChange={(e) => setPreferredTimeSlots(e.target.value)}
                    placeholder="Ví dụ: T2-T4-T6 18h-20h, T7-CN 7h-9h..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Giới thiệu ngắn (Bio)</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Chia sẻ kinh nghiệm, tiêu chí chọn nhóm đánh cầu..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                <Button onClick={handleUpdate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.color} shrink-0`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-lg font-bold truncate mt-0.5">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Profile Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 mb-4 ring-4 ring-emerald-500/20">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-xl font-bold">{profile.full_name}</h2>

          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <Badge className={`${currentSkillInfo.color} font-medium`}>
              🏸 {currentSkillInfo.label}
            </Badge>
            <Badge variant="secondary">
              {profile.role === 'CLUB_OWNER' ? 'Chủ Câu Lạc Bộ' : profile.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
              {profile.status === 'APPROVED' ? 'Đã duyệt' : profile.status}
            </Badge>
          </div>

          {profile.bio && (
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground italic max-w-md">
              &quot;{profile.bio}&quot;
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border">
            <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Trình độ & Tần suất</p>
              <p className="text-sm font-semibold">{currentSkillInfo.label} · {profile.play_frequency || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border">
            <Clock className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Khung giờ thường đánh</p>
              <p className="text-sm font-medium">
                {(profile.preferred_time_slots && profile.preferred_time_slots.length > 0)
                  ? profile.preferred_time_slots.join(' · ')
                  : 'Tối T2, T4, T6 (18:00 - 21:00)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border">
            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email liên hệ</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Vai trò trong hệ thống</p>
              <p className="text-sm font-medium">
                {profile.role === 'CLUB_OWNER'
                  ? 'Chủ CLB (Club Owner)'
                  : profile.role === 'ADMIN'
                    ? 'Quản trị hệ thống (Admin)'
                    : 'Thành viên (Member)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border">
            <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Ngày tham gia</p>
              <p className="text-sm font-medium">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
