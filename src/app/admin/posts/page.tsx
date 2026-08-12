import { getAllPostsForAdmin } from '@/services/post.service';
import { AdminPostsClient } from '@/components/admin/posts-admin-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quản lý bài đăng' };

export default async function AdminPostsPage() {
  const posts = await getAllPostsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý bài đăng</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Duyệt, kiểm duyệt và xóa các bài viết tuyển thành viên / giao lưu
        </p>
      </div>

      <AdminPostsClient initialPosts={posts} />
    </div>
  );
}
