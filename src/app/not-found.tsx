import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-background">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-card rounded-3xl border shadow-xl shadow-black/5 p-8 sm:p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-6">
            <FileQuestion className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold mb-3">Không tìm thấy trang (404)</h1>
          <p className="text-muted-foreground leading-relaxed text-sm mb-6">
            Trang bạn đang truy cập không tồn tại hoặc đã được chuyển sang địa chỉ khác.
          </p>

          <Link href="/schedule">
            <Button variant="outline" className="rounded-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại Bảng điều khiển
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
