'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { formatTime } from '@/lib/utils/date';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { RecurringSchedule } from '@/types';
import { Plus, CalendarDays, Clock, MapPin, Loader2 } from 'lucide-react';

interface Props {
  schedules: RecurringSchedule[];
}

const DAYS = [
  { value: '1', label: 'Thứ Hai' },
  { value: '2', label: 'Thứ Ba' },
  { value: '3', label: 'Thứ Tư' },
  { value: '4', label: 'Thứ Năm' },
  { value: '5', label: 'Thứ Sáu' },
  { value: '6', label: 'Thứ Bảy' },
  { value: '0', label: 'Chủ Nhật' },
];

export function AdminSchedulesClient({ schedules }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState('1');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [court, setCourt] = useState('');

  const handleCreate = async () => {
    if (!court.trim()) {
      toast.error('Vui lòng nhập tên sân');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('recurring_schedules').insert({
        day_of_week: parseInt(day),
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        court_name: court,
        created_by: user!.id,
      });

      if (error) throw error;

      toast.success('Đã thêm lịch cố định thành công!');
      setDialogOpen(false);
      setCourt('');
      router.refresh();
    } catch {
      toast.error('Không thể thêm lịch');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('recurring_schedules')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast.error('Cập nhật thất bại');
    } else {
      toast.success(active ? 'Đã kích hoạt lịch' : 'Đã tạm dừng lịch');
      router.refresh();
    }
  };

  const getDayLabel = (d: number) => {
    const found = DAYS.find((item) => item.value === String(d));
    return found ? found.label : `Thứ ${d}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Thêm lịch cố định
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Lịch Cố Định Mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ngày trong tuần</Label>
                <Select value={day} onValueChange={(val) => val && setDay(val)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Giờ bắt đầu</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Giờ kết thúc</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Tên sân</Label>
                <Input value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Ví dụ: Sân A - Quận 1" className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Tạo mới
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Chưa có lịch cố định</h3>
          <p className="text-sm text-muted-foreground">Tạo lịch cố định hàng tuần để hệ thống tự động sinh các buổi tập.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={`p-4 ${!schedule.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs">
                  {getDayLabel(schedule.day_of_week)}
                </Badge>
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={(checked) => handleToggle(schedule.id, checked)}
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{schedule.court_name}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
