'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut, Send, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resendApprovalRequest } from '@/services/user.service';

export default function BlockedPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleResendRequest = async () => {
    setResending(true);
    try {
      const result = await resendApprovalRequest();
      if (result.success) {
        toast.success('Đã gửi lại yêu cầu xin xét duyệt tới Admin! Tài khoản đã chuyển về trạng thái Chờ duyệt.');
        router.push('/pending');
        router.refresh();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50/30 dark:from-red-950/20 dark:via-background dark:to-background p-4">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="bg-card rounded-3xl border shadow-xl shadow-black/5 p-6 sm:p-10 space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
            <p className="text-muted-foreground leading-relaxed text-sm mt-2">
              Tài khoản của bạn đã bị từ chối hoặc tạm khóa. Nếu bạn muốn xin xét duyệt lại hoặc tin rằng đây là nhầm lẫn, vui lòng nhấn nút bên dưới.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendRequest}
              disabled={resending}
              className="w-full h-11 rounded-xl text-sm font-medium gap-2 shadow-xs"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi lại yêu cầu xin xét duyệt tới Admin
            </Button>

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
    </div>
  );
}
