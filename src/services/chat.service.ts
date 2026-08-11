'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_id?: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export interface ChatConversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  userStatus?: string;
  lastMessage: string;
  lastMessageTime: string;
}

/**
 * Get chat messages for a specific user (or for admin viewing a user)
 */
export async function getChatMessages(targetUserId?: string): Promise<ChatMessage[]> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_chat_messages')
      .maybeSingle();

    let allMessages: ChatMessage[] = [];
    if (data?.value) {
      allMessages = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }

    if (targetUserId) {
      return allMessages.filter(
        (m) => m.sender_id === targetUserId || m.receiver_id === targetUserId
      );
    }
    return allMessages;
  } catch {
    return [];
  }
}

/**
 * Get all user conversations for Admin selection
 */
export async function getAdminConversations(): Promise<ChatConversation[]> {
  try {
    const adminClient = createAdminClient();
    const [profilesRes, messagesRes] = await Promise.all([
      adminClient.from('profiles').select('id, full_name, avatar_url, status, role').order('created_at', { ascending: false }),
      adminClient.from('app_settings').select('value').eq('key', 'admin_chat_messages').maybeSingle(),
    ]);

    const profiles = profilesRes.data || [];
    let allMessages: ChatMessage[] = [];
    if (messagesRes.data?.value) {
      try {
        allMessages = typeof messagesRes.data.value === 'string' ? JSON.parse(messagesRes.data.value) : messagesRes.data.value;
      } catch {
        allMessages = [];
      }
    }

    // Map profiles to conversations
    const conversationMap = new Map<string, ChatConversation>();

    for (const p of profiles) {
      if (p.role === 'ADMIN') continue; // Skip admin self in user list

      const userMsgs = allMessages.filter((m) => m.sender_id === p.id || m.receiver_id === p.id);
      const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;

      conversationMap.set(p.id, {
        userId: p.id,
        userName: p.full_name,
        userAvatar: p.avatar_url || '',
        userStatus: p.status,
        lastMessage: lastMsg ? lastMsg.message : 'Chưa có tin nhắn',
        lastMessageTime: lastMsg ? lastMsg.created_at : '',
      });
    }

    const conversations = Array.from(conversationMap.values());

    // Sort: users with recent messages first, then by name
    conversations.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.userName.localeCompare(b.userName);
    });

    return conversations;
  } catch {
    return [];
  }
}

/**
 * Send a chat message to admin (or admin reply to user)
 */
export async function sendChatMessage(input: {
  message: string;
  receiverId?: string;
}): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
  try {
    if (!input.message.trim()) {
      return { success: false, error: 'Nội dung tin nhắn không được để trống' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    const adminClient = createAdminClient();

    // Fetch sender profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'ADMIN';

    const { data: existingSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_chat_messages')
      .maybeSingle();

    let allMessages: ChatMessage[] = [];
    if (existingSetting?.value) {
      try {
        allMessages = typeof existingSetting.value === 'string' ? JSON.parse(existingSetting.value) : existingSetting.value;
      } catch {
        allMessages = [];
      }
    }

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sender_id: user.id,
      sender_name: profile?.full_name || user.email || 'Thành viên',
      sender_avatar: profile?.avatar_url || '',
      receiver_id: input.receiverId || (isAdmin ? undefined : 'ADMIN'),
      message: input.message.trim(),
      is_admin: isAdmin,
      created_at: new Date().toISOString(),
    };

    allMessages.push(newMsg);

    await adminClient.from('app_settings').upsert({
      key: 'admin_chat_messages',
      value: JSON.stringify(allMessages),
      updated_by: user.id,
    });

    return { success: true, message: newMsg };
  } catch (err: any) {
    return { success: false, error: err.message || 'Không thể gửi tin nhắn' };
  }
}
