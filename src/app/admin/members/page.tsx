import { getAllProfiles } from '@/services/user.service';
import { MembersClient } from '@/components/admin/members-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Thành viên',
};

export default async function AdminMembersPage() {
  const profiles = await getAllProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Thành viên</h1>
        <p className="text-muted-foreground text-sm mt-1">Duyệt và quản lý tài khoản thành viên câu lạc bộ</p>
      </div>

      <MembersClient profiles={profiles} />
    </div>
  );
}
