'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resendApprovalRequest } from '@/services/user.service';
import { AdminChatWidget } from '@/components/chat/admin-chat-widget';
import type { Profile } from '@/types';

export default function PendingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fetchProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) {
          if (data.status === 'APPROVED') {
            router.push('/schedule');
            return;
          }
          setProfile(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleResendRequest = async () => {
    setResending(true);
    try {
      const result = await resendApprovalRequest();
      if (result.success) {
        toast.success('Đã gửi lại yêu cầu phê duyệt tới Ban Quản Trị qua Email!');
        await fetchProfile();
      } else {
        toast.error(result.error || 'Gửi yêu cầu thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Calculate elapsed time in hours since profile created_at
  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const elapsedMs = Date.now() - createdAt.getTime();
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const isOver24Hours = elapsedHours >= 24;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-background dark:to-background p-4">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="bg-card rounded-3xl border shadow-xl shadow-black/5 p-6 sm:p-10 space-y-6">
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Tài khoản đang chờ duyệt</h1>
            <p className="text-muted-foreground leading-relaxed text-sm mt-2">
              Xin chào <strong>{profile?.full_name || 'Thành viên'}</strong> ({profile?.email}), tài khoản của bạn đang chờ Ban Quản Trị phê duyệt.
            </p>
          </div>

          {/* Time & Alert Box */}
          {loading ? (
            <div className="py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : isOver24Hours ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Đã quá 24 giờ kể từ khi gửi yêu cầu
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                Đã chờ <strong>{elapsedHours} giờ</strong> nhưng Admin chưa phê duyệt. Bạn có thể nhấn nút dưới đây để gửi lại thông báo khẩn qua Email cho Ban Quản Trị!
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 text-left space-y-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                ⏱️ Thời gian đã chờ: {elapsedHours} giờ / 24 giờ
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Ban Quản Trị đã nhận được thông báo qua Email. Nếu sau 24 giờ chưa được duyệt, hệ thống sẽ mở nút gửi lại yêu cầu phê duyệt khẩn cấp.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {isOver24Hours && (
              <Button
                onClick={handleResendRequest}
                disabled={resending}
                className="w-full h-11 rounded-xl text-sm font-medium gap-2 shadow-xs"
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gửi lại yêu cầu phê duyệt cho Admin
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full h-10 rounded-xl text-xs gap-2"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất & Quay lại trang Đăng nhập
            </Button>
          </div>
        </div>
      </div>

      {/* Global Live Chat Widget for Pending Users */}
      {profile && (
        <AdminChatWidget
          currentUserId={profile.id}
          currentUserName={profile.full_name}
          currentUserAvatar={profile.avatar_url || ''}
          isAdmin={false}
        />
      )}
    </div>
  );
}
