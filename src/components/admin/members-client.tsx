'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { updateUserStatus, updateUserRole } from '@/services/user.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import { Search, MoreHorizontal, Check, X, Shield, Ban, Loader2 } from 'lucide-react';

interface Props {
  profiles: Profile[];
}

export function MembersClient({ profiles }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = profiles.filter((p) => {
    const matchesSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAction = async (userId: string, action: string) => {
    setLoading(userId);
    try {
      if (action === 'APPROVE') await updateUserStatus(userId, 'APPROVED');
      else if (action === 'REJECT') await updateUserStatus(userId, 'REJECTED');
      else if (action === 'BLOCK') await updateUserStatus(userId, 'BLOCKED');
      else if (action === 'UNBLOCK') await updateUserStatus(userId, 'APPROVED');
      else if (action === 'MAKE_ADMIN') await updateUserRole(userId, 'ADMIN');
      else if (action === 'MAKE_USER') await updateUserRole(userId, 'USER');

      toast.success('Đã cập nhật trạng thái thành viên');
      router.refresh();
    } catch {
      toast.error('Không thể cập nhật thành viên');
    } finally {
      setLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; style: string }> = {
      APPROVED: { label: 'Đã duyệt', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      PENDING: { label: 'Chờ duyệt', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      REJECTED: { label: 'Từ chối', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      BLOCKED: { label: 'Đã khóa', style: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    };
    const info = map[status] || { label: status, style: '' };
    return <Badge variant="secondary" className={info.style}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="ALL">Tất cả</TabsTrigger>
            <TabsTrigger value="PENDING">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="APPROVED">Hoạt động</TabsTrigger>
            <TabsTrigger value="BLOCKED">Đã khóa</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Thành viên</th>
                  <th className="text-left p-3 font-medium">Trạng thái</th>
                  <th className="text-left p-3 font-medium">Vai trò</th>
                  <th className="text-left p-3 font-medium">Ngày tham gia</th>
                  <th className="text-right p-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((profile) => {
                  const initials = profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={profile.avatar_url || ''} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{statusBadge(profile.status)}</td>
                      <td className="p-3">
                        <Badge variant={profile.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                          {profile.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 text-right">
                        {loading === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {profile.status === 'PENDING' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAction(profile.id, 'APPROVE')}>
                                    <Check className="h-4 w-4 mr-2 text-emerald-600" /> Duyệt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction(profile.id, 'REJECT')}>
                                    <X className="h-4 w-4 mr-2 text-red-600" /> Từ chối
                                  </DropdownMenuItem>
                                </>
                              )}
                              {profile.status === 'APPROVED' && (
                                <DropdownMenuItem onClick={() => handleAction(profile.id, 'BLOCK')}>
                                  <Ban className="h-4 w-4 mr-2" /> Khóa tài khoản
                                </DropdownMenuItem>
                              )}
                              {profile.status === 'BLOCKED' && (
                                <DropdownMenuItem onClick={() => handleAction(profile.id, 'UNBLOCK')}>
                                  <Check className="h-4 w-4 mr-2" /> Mở khóa
                                </DropdownMenuItem>
                              )}
                              {profile.role === 'USER' && profile.status === 'APPROVED' && (
                                <DropdownMenuItem onClick={() => handleAction(profile.id, 'MAKE_ADMIN')}>
                                  <Shield className="h-4 w-4 mr-2" /> Cấp quyền Admin
                                </DropdownMenuItem>
                              )}
                              {profile.role === 'ADMIN' && (
                                <DropdownMenuItem onClick={() => handleAction(profile.id, 'MAKE_USER')}>
                                  <Shield className="h-4 w-4 mr-2" /> Bỏ quyền Admin
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((profile) => {
          const initials = profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <Card key={profile.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(profile.status)}
                </div>
              </div>
              {profile.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 text-xs" onClick={() => handleAction(profile.id, 'APPROVE')}>
                    <Check className="h-3 w-3 mr-1" /> Duyệt
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleAction(profile.id, 'REJECT')}>
                    <X className="h-3 w-3 mr-1" /> Từ chối
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Không tìm thấy thành viên nào.</p>
        </Card>
      )}
    </div>
  );
}
