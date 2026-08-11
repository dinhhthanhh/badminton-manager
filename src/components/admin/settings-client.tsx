'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2 } from 'lucide-react';
import { updateAppSettings } from '@/services/settings.service';
import { toast } from 'sonner';

interface Props {
  initialSettings: Record<string, any>;
}

export function SettingsClient({ initialSettings }: Props) {
  const [loading, setLoading] = useState(false);
  const [clubName, setClubName] = useState(initialSettings.club_name || 'ShuttleHub');
  const [openHours, setOpenHours] = useState(initialSettings.registration_open_hours || 48);
  const [closeHours, setCloseHours] = useState(initialSettings.registration_close_hours || 1);
  const [lateHours, setLateHours] = useState(initialSettings.late_cancellation_hours || 6);
  const [duration, setDuration] = useState(initialSettings.default_session_duration_minutes || 120);
  const [weeksAhead, setWeeksAhead] = useState(initialSettings.session_generation_weeks_ahead || 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await updateAppSettings({
        club_name: clubName,
        registration_open_hours: Number(openHours),
        registration_close_hours: Number(closeHours),
        late_cancellation_hours: Number(lateHours),
        default_session_duration_minutes: Number(duration),
        session_generation_weeks_ahead: Number(weeksAhead),
      });

      if (res.success) {
        toast.success('Đã lưu cài đặt câu lạc bộ!');
      } else {
        toast.error(res.error || 'Cập nhật thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Cấu hình Câu lạc bộ</h2>
        </div>

        <div className="grid gap-5">
          <div>
            <Label htmlFor="club_name">Tên Câu lạc bộ</Label>
            <Input
              id="club_name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="open_hours">Mở đăng ký (giờ trước buổi tập)</Label>
              <Input
                id="open_hours"
                type="number"
                value={openHours}
                onChange={(e) => setOpenHours(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="close_hours">Đóng đăng ký (giờ trước buổi tập)</Label>
              <Input
                id="close_hours"
                type="number"
                value={closeHours}
                onChange={(e) => setCloseHours(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="late_hours">Hủy muộn (giờ trước buổi tập)</Label>
              <Input
                id="late_hours"
                type="number"
                value={lateHours}
                onChange={(e) => setLateHours(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="duration">Thời lượng buổi tập mặc định (phút)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="weeks">Tự động sinh lịch trước (số tuần)</Label>
            <Input
              id="weeks"
              type="number"
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu cài đặt
        </Button>
      </Card>
    </form>
  );
}
