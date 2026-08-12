'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SKILL_LEVEL_LABELS, POST_TYPE_LABELS, type PostType, type SkillLevel } from '@/lib/config';
import { createPost, deletePost } from '@/services/post.service';
import { formatDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Post, Profile, Club } from '@/types';
import {
  PlusCircle, Users, MapPin, Clock, PhoneCall,
  Trash2, Loader2, MessageSquare, Search, Share2, UserCheck,
} from 'lucide-react';
import {
  CourtSvgIcon, ShuttlecockSvgIcon, DrinkSvgIcon,
  RecruitMemberSvgIcon, MatchVersusSvgIcon, TrophyStarSvgIcon,
} from '@/components/icons/custom-svg-icons';
import Link from 'next/link';

interface Props {
  posts: Post[];
  profile: Profile;
  myClubs: Club[];
}

export function PostsFeedClient({ posts, profile, myClubs }: Props) {
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [postType, setPostType] = useState<PostType>('RECRUIT_MEMBER');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [skillRequired, setSkillRequired] = useState<string>('INTERMEDIATE');
  const [preferredTime, setPreferredTime] = useState('');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const filteredPosts = filterType === 'ALL'
    ? posts
    : posts.filter((p) => p.type === filterType);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung bài viết');
      return;
    }

    setLoading(true);
    try {
      const res = await createPost({
        type: postType,
        title,
        content,
        skillLevelRequired: skillRequired,
        preferredTime,
        location,
        contactInfo,
        clubId: selectedClubId || undefined,
      });

      if (res.success) {
        toast.success('Đã đăng bài thành công!');
        setCreateDialogOpen(false);
        setTitle('');
        setContent('');
        setPreferredTime('');
        setLocation('');
        setContactInfo('');
        router.refresh();
      } else {
        toast.error(res.error || 'Đăng bài thất bại');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    setDeletingId(postId);
    try {
      const res = await deletePost(postId);
      if (res.success) {
        toast.success('Đã xóa bài viết');
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
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 sm:flex">
            <TabsTrigger value="ALL">Tất cả bài đăng</TabsTrigger>
            <TabsTrigger value="RECRUIT_MEMBER">Tuyển thành viên</TabsTrigger>
            <TabsTrigger value="FIND_OPPONENT">Tìm đối giao lưu</TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shrink-0">
            <PlusCircle className="h-4 w-4" />
            Đăng bài tuyển / giao lưu
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                Tạo bài đăng mới
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreatePost} className="space-y-4 py-2 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Loại bài đăng</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as PostType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="RECRUIT_MEMBER">🏸 Tuyển thành viên cho Câu lạc bộ</option>
                  <option value="FIND_OPPONENT">🔥 Tìm đối / Nhóm giao lưu thi đấu</option>
                  <option value="GENERAL">📢 Thông báo / Thảo luận chung</option>
                </select>
              </div>

              {myClubs.length > 0 && postType === 'RECRUIT_MEMBER' && (
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Gắn với Câu lạc bộ của bạn</label>
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Không gắn (Bài cá nhân)</option>
                    {myClubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        CLB: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Tiêu đề bài đăng</label>
                <Input
                  placeholder="Ví dụ: CLB Sân Viettel tuyển 2 thành viên Nam/Nữ trình độ Trung Bình..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Nội dung chi tiết</label>
                <Textarea
                  placeholder="Mô tả tiêu chí tuyển, không khí CLB, hình thức chia tiền sân..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Trình độ yêu cầu</label>
                  <select
                    value={skillRequired}
                    onChange={(e) => setSkillRequired(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(SKILL_LEVEL_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Thời gian đánh cầu</label>
                  <Input
                    placeholder="T2, T4, T6 từ 19h - 21h"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Địa điểm sân đánh</label>
                  <Input
                    placeholder="Sân cầu lông Viettel, Q.10"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">SĐT / Zalo liên hệ</label>
                  <Input
                    placeholder="0901234567 (Zalo)"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Đăng Bài Ngay
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feed List */}
      {filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1">Chưa có bài đăng nào</h3>
          <p className="text-sm text-muted-foreground">
            Hãy là người đầu tiên đăng bài tuyển thành viên hoặc tìm đối giao lưu!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const authorInitials = post.author?.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            const isAuthor = post.author_id === profile.id;
            const isAdmin = profile.role === 'ADMIN';
            const postBadgeInfo = POST_TYPE_LABELS[post.type] || POST_TYPE_LABELS.GENERAL;
            const requiredSkillInfo = post.skill_level_required
              ? SKILL_LEVEL_LABELS[post.skill_level_required as SkillLevel]
              : null;

            return (
              <Card key={post.id} className="p-5 sm:p-6 hover:border-emerald-500/30 transition-all space-y-4">
                {/* Author Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/explore/users/${post.author_id}`}>
                      <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20 hover:opacity-80 transition-opacity">
                        <AvatarImage src={post.author?.avatar_url || ''} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                          {authorInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/explore/users/${post.author_id}`}
                          className="font-bold text-sm sm:text-base hover:text-emerald-600 transition-colors"
                        >
                          {post.author?.full_name}
                        </Link>
                        {post.club && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                            CLB: {post.club.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Đăng ngày {formatDate(post.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`${postBadgeInfo.color} text-[10px] font-semibold`}>
                      {postBadgeInfo.badge}
                    </Badge>
                    {(isAuthor || isAdmin) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingId === post.id}
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Title & Content */}
                <div className="space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-foreground">{post.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Requirement Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {requiredSkillInfo && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border">
                      <TrophyStarSvgIcon className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Trình độ yêu cầu: </span>
                        <span className="font-semibold">{requiredSkillInfo.label}</span>
                      </div>
                    </div>
                  )}

                  {post.preferred_time && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border">
                      <ShuttlecockSvgIcon className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Khung giờ: </span>
                        <span className="font-semibold">{post.preferred_time}</span>
                      </div>
                    </div>
                  )}

                  {post.location && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border">
                      <CourtSvgIcon className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Sân cầu: </span>
                        <span className="font-semibold">{post.location}</span>
                      </div>
                    </div>
                  )}

                  {post.contact_info && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/50">
                      <RecruitMemberSvgIcon className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Liên hệ: </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{post.contact_info}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-3 border-t text-xs">
                  <Link href={`/explore/users/${post.author_id}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-700 hover:bg-emerald-50">
                      <UserCheck className="h-3.5 w-3.5" /> Xem Profile người đăng
                    </Button>
                  </Link>

                  {post.contact_info && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(post.contact_info || '');
                        toast.success('Đã sao chép thông tin liên hệ!');
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Sao chép SĐT / Zalo
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
