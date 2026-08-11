'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { getUserNotifications, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/services/notification.service';
import type { Notification } from '@/types';
import Link from 'next/link';

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [data, count] = await Promise.all([
        getUserNotifications(10),
        getUnreadNotificationCount(),
      ]);
      setNotifications(data);
      setUnreadCount(count);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        <div className="flex items-center justify-between p-3.5 border-b bg-card">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Thông báo</span>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount} mới
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Đã đọc tất cả
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Không có thông báo nào.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 text-xs space-y-1 hover:bg-muted/50 transition-colors ${
                  !n.is_read ? 'bg-primary/5 font-medium' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground text-xs">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{n.message}</p>
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className="inline-block text-[11px] text-primary hover:underline pt-0.5"
                  >
                    Xem chi tiết →
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
