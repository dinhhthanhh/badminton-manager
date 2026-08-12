'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { deletePost } from '@/services/post.service';
import { formatDate } from '@/lib/utils/date';
import { POST_TYPE_LABELS } from '@/lib/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Post } from '@/types';
import { Search, Trash2, Loader2, MessageSquare, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface Props {
  initialPosts: Post[];
}

export function AdminPostsClient({ initialPosts }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPosts = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    (p.author?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này với tư cách Admin?')) return;
    setDeletingId(postId);
    try {
      const res = await deletePost(postId);
      if (res.success) {
        toast.success('Đã xóa bài đăng');
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        router.refresh();
      } else {
        toast.error(res.error || 'Xóa thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết theo tiêu đề, nội dung, tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {filteredPosts.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Không tìm thấy bài viết nào.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const authorInitials = post.author?.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            const postBadgeInfo = POST_TYPE_LABELS[post.type] || POST_TYPE_LABELS.GENERAL;

            return (
              <Card key={post.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={post.author?.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {authorInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/explore/users/${post.author_id}`}
                        className="font-semibold text-sm hover:underline text-foreground"
                      >
                        {post.author?.full_name}
                      </Link>
                      <Badge className={`${postBadgeInfo.color} text-[9px]`}>
                        {postBadgeInfo.badge}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-foreground truncate">{post.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{post.content}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Xóa bài
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
