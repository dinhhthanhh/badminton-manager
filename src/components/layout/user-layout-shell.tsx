'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  History,
  User,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_CONFIG } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { NotificationDropdown } from './notification-dropdown';
import { useState } from 'react';
import { AdminChatWidget } from '@/components/chat/admin-chat-widget';
import type { Profile } from '@/types';

interface UserLayoutShellProps {
  children: React.ReactNode;
  profile: Profile;
  unreadCount: number;
  clubName?: string;
}

const navItems = [
  { href: '/schedule', label: 'Lịch thi đấu', icon: CalendarDays },
  { href: '/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/history', label: 'Lịch sử', icon: History },
  { href: '/profile', label: 'Hồ sơ', icon: User },
];

export function UserLayoutShell({ children, profile, unreadCount, clubName }: UserLayoutShellProps) {
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

  const isAdmin = profile.role === 'ADMIN';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card lg:fixed lg:inset-y-0">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏸</span>
            <span className="font-bold text-lg">{displayName}</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="border-t p-3">
          {/* Admin Switcher Button - Positioned exactly above avatar */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200/80 transition-colors mb-2"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Giao diện Admin</span>
            </Link>
          )}

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
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mt-1 text-muted-foreground hover:text-foreground text-xs"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-16 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 justify-between lg:justify-end">
          {/* Mobile menu */}
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between">
                <div>
                  <div className="h-16 flex items-center gap-2 px-6 border-b">
                    <span className="text-xl">🏸</span>
                    <span className="font-bold text-lg">{displayName}</span>
                  </div>
                  <nav className="px-3 py-4 space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          pathname === item.href
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>

                <div className="border-t p-3">
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200/80 transition-colors mb-2"
                    >
                      <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>Giao diện Admin</span>
                    </Link>
                  )}
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
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">{APP_CONFIG.name}</span>
          </div>

          {/* Right side - Admin Button (Mobile only) & Notifications */}
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Link href="/admin/dashboard" className="lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/80 shadow-2xs"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Giao diện Admin
                </Button>
              </Link>
            )}

            <NotificationDropdown />

            <Avatar className="h-8 w-8 lg:hidden">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Global Admin Live Chat Widget */}
        <AdminChatWidget
          currentUserId={profile.id}
          currentUserName={profile.full_name}
          currentUserAvatar={profile.avatar_url || ''}
          isAdmin={profile.role === 'ADMIN'}
        />
      </div>
    </div>
  );
}
