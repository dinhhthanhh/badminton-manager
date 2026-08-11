import { createAdminClient } from '@/lib/supabase/admin';
import { SettingsClient } from '@/components/admin/settings-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cài đặt' };

export default async function AdminSettingsPage() {
  const adminClient = createAdminClient();
  const { data: settings } = await adminClient.from('app_settings').select('*');

  const initialSettings: Record<string, any> = {};
  if (settings) {
    for (const item of settings) {
      try {
        initialSettings[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
      } catch {
        initialSettings[item.key] = item.value;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình thông số hoạt động của câu lạc bộ</p>
      </div>

      <SettingsClient initialSettings={initialSettings} />
    </div>
  );
}
