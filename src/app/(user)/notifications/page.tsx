import { getUserNotifications, markAllNotificationsAsRead } from '@/services/notification.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thông báo',
};

export default async function NotificationsPage() {
  const notifications = await getUserNotifications(50);

  const unread = notifications.filter((n) => !n.is_read).length;

  async function handleMarkAllRead() {
    'use server';
    await markAllNotificationsAsRead();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thông báo</h1>
          {unread > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unread} chưa đọc</p>
          )}
        </div>
        {unread > 0 && (
          <form action={handleMarkAllRead}>
            <Button variant="outline" size="sm" type="submit" className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Không có thông báo mới</h3>
          <p className="text-sm text-muted-foreground">Bạn đã cập nhật tất cả thông tin mới nhất!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`p-4 transition-colors ${
                !notif.is_read ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium">{notif.title}</p>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {notif.link && (
                  <Link href={notif.link}>
                    <Button variant="ghost" size="sm" className="text-xs shrink-0">
                      Xem
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
