'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updateAppSettings(settingsMap: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'ADMIN') {
      return { success: false, error: 'Không có quyền truy cập' };
    }

    for (const [key, value] of Object.entries(settingsMap)) {
      await adminClient.from('app_settings').upsert({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updated_by: user.id,
      });
    }

    revalidatePath('/admin/settings');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cập nhật thất bại' };
  }
}

export async function getClubName(): Promise<string> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'club_name')
      .maybeSingle();

    if (data?.value) {
      let val = data.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch { /* raw string */ }
      }
      if (val && typeof val === 'string' && val.trim()) return val.trim();
    }
  } catch {
    // fallback
  }
  const { APP_CONFIG } = await import('@/lib/config');
  return APP_CONFIG.name;
}
