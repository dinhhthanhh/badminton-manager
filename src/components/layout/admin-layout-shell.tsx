'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  BarChart3,
  Settings,
  Clock,
  LogOut,
  Menu,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdminChatWidget } from '@/components/chat/admin-chat-widget';
import { Badge } from '@/components/ui/badge';
import { APP_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from './notification-dropdown';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  profile: {
    id?: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  pendingCount: number;
  clubName?: string;
}

const navItems = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Thành viên', icon: Users },
  { href: '/admin/posts', label: 'Bài đăng', icon: MessageSquare },
  { href: '/admin/sessions', label: 'Buổi tập', icon: CalendarDays },
  { href: '/admin/schedules', label: 'Lịch cố định', icon: Clock },
  { href: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export function AdminLayoutShell({ children, profile, pendingCount, clubName }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = clubName || APP_CONFIG.name;

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card lg:fixed lg:inset-y-0">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">{displayName}</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">Admin</Badge>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.label === 'Thành viên' && pendingCount > 0 && (
                <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t p-3">
          <Link href="/schedule" className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200/80 transition-colors mb-2">
            <LayoutDashboard className="h-5 w-5" />
            Giao diện người dùng
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 mt-1 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 h-16 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 justify-between lg:justify-end">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="h-16 flex items-center gap-2 px-6 border-b">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-bold">{APP_CONFIG.name}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">Admin</Badge>
                </div>
                <nav className="px-3 py-4 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        pathname.startsWith(item.href)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <span className="font-semibold">Quản trị viên</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/schedule" className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/80 shadow-2xs"
              >
                <LayoutDashboard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Giao diện Người dùng
              </Button>
            </Link>
            <NotificationDropdown />
            <Avatar className="h-8 w-8 lg:hidden">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <AdminChatWidget
          currentUserId={profile.id || 'admin'}
          currentUserName={profile.full_name}
          currentUserAvatar={profile.avatar_url || ''}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
