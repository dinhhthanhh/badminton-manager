'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Post } from '@/types';
import type { PostType } from '@/lib/config';

export interface CreatePostInput {
  type: PostType;
  title: string;
  content: string;
  skillLevelRequired?: string;
  preferredTime?: string;
  location?: string;
  contactInfo?: string;
  clubId?: string;
}

/**
 * Create a new post (recruitment / find opponent)
 */
export async function createPost(input: CreatePostInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    if (!input.title.trim() || !input.content.trim()) {
      return { success: false, error: 'Tiêu đề và nội dung không được để trống' };
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('posts')
      .insert({
        author_id: user.id,
        club_id: input.clubId || null,
        type: input.type,
        title: input.title.trim(),
        content: input.content.trim(),
        skill_level_required: input.skillLevelRequired || null,
        preferred_time: input.preferredTime || null,
        location: input.location || null,
        contact_info: input.contactInfo || null,
        status: 'ACTIVE',
      });

    if (error) {
      return { success: false, error: error.message || 'Đăng bài thất bại' };
    }

    revalidatePath('/explore');
    revalidatePath('/admin/posts');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi tạo bài đăng' };
  }
}

/**
 * Get posts for the feed with optional filters
 */
export async function getPosts(filters?: {
  type?: string;
  skillLevel?: string;
  clubId?: string;
}): Promise<Post[]> {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from('posts')
      .select(`
        *,
        author:author_id (id, full_name, avatar_url, skill_level),
        club:club_id (id, name, avatar_url)
      `)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (filters?.type && filters.type !== 'ALL') {
      query = query.eq('type', filters.type);
    }

    if (filters?.skillLevel && filters.skillLevel !== 'ALL') {
      query = query.eq('skill_level_required', filters.skillLevel);
    }

    if (filters?.clubId) {
      query = query.eq('club_id', filters.clubId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data as unknown as Post[];
  } catch {
    return [];
  }
}

/**
 * Get all posts for Admin moderation
 */
export async function getAllPostsForAdmin(): Promise<Post[]> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('posts')
      .select(`
        *,
        author:author_id (id, full_name, avatar_url, skill_level),
        club:club_id (id, name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as unknown as Post[];
  } catch {
    return [];
  }
}

/**
 * Delete or soft-delete a post (Author or Admin)
 */
export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Check ownership or admin
    const { data: post } = await adminClient
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!post) return { success: false, error: 'Không tìm thấy bài đăng' };

    const isAuthor = post.author_id === user.id;
    const isAdmin = profile?.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return { success: false, error: 'Bạn không có quyền xóa bài viết này' };
    }

    const { error } = await adminClient
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/explore');
    revalidatePath('/admin/posts');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Xóa thất bại' };
  }
}
