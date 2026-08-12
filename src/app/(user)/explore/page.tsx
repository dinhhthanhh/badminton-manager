import { getPosts } from '@/services/post.service';
import { getCurrentProfile } from '@/services/user.service';
import { getUserClubs } from '@/services/club.service';
import { redirect } from 'next/navigation';
import { PostsFeedClient } from '@/components/explore/posts-feed-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Khám phá - Bài đăng tuyển thành viên & Giao lưu',
};

export default async function ExplorePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const [posts, myClubs] = await Promise.all([
    getPosts(),
    getUserClubs(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bảng tin & Tuyển thành viên</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tìm kiếm câu lạc bộ, tuyển thêm thành viên hoặc giao lưu cọ xát
        </p>
      </div>

      <PostsFeedClient posts={posts} profile={profile} myClubs={myClubs} />
    </div>
  );
}
