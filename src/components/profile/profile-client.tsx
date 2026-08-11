'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/date';
import { formatVND } from '@/lib/utils/money';
import { updateUserProfile } from '@/services/user.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import { Mail, Calendar, Shield, Edit3, Loader2, CalendarDays, CreditCard, TrendingUp } from 'lucide-react';

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
      await updateUserProfile(fullName);
      toast.success('Đã cập nhật tên hiển thị!');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors">
            <Edit3 className="h-4 w-4" />
            Sửa tên
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đổi tên hiển thị</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-xs font-medium text-muted-foreground">Tên hiển thị mới</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập tên đầy đủ của bạn..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={handleUpdate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats Cards (Moved from Overview/Dashboard) */}
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
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-xl font-bold">{profile.full_name}</h2>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {profile.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
              {profile.status === 'APPROVED' ? 'Đã duyệt' : profile.status === 'PENDING' ? 'Chờ duyệt' : profile.status}
            </Badge>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50">
            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Vai trò</p>
              <p className="text-sm font-medium">{profile.role === 'ADMIN' ? 'Quản trị viên (Admin)' : 'Thành viên (Member)'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50">
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
