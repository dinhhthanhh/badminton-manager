'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  getChatMessages,
  getAdminConversations,
  sendChatMessage,
  type ChatMessage,
  type ChatConversation,
} from '@/services/chat.service';
import { MessageSquare, Send, X, Shield, Loader2, Users, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isAdmin?: boolean;
}

export function AdminChatWidget({ currentUserId, currentUserName, currentUserAvatar, isAdmin = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatConversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'CHAT'>(isAdmin ? 'LIST' : 'CHAT');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadAdminConversations = async () => {
    try {
      const convs = await getAdminConversations();
      setConversations(convs);
    } catch {
      // silent
    }
  };

  const loadMessages = async (targetId?: string) => {
    try {
      const activeId = targetId || selectedUser?.userId || (isAdmin ? undefined : currentUserId);
      if (!activeId && isAdmin) return;
      const data = await getChatMessages(activeId);
      setMessages(data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      if (isAdmin) {
        loadAdminConversations().finally(() => setLoading(false));
      } else {
        loadMessages().finally(() => setLoading(false));
      }

      const interval = setInterval(() => {
        if (isAdmin) {
          loadAdminConversations();
          if (selectedUser) loadMessages(selectedUser.userId);
        } else {
          loadMessages();
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, selectedUser, isAdmin]);

  useEffect(() => {
    if (isOpen && viewMode === 'CHAT') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, viewMode]);

  const handleSelectUser = (conv: ChatConversation) => {
    setSelectedUser(conv);
    setViewMode('CHAT');
    setLoading(true);
    loadMessages(conv.userId).finally(() => setLoading(false));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const msgText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const targetReceiverId = isAdmin ? selectedUser?.userId : undefined;

    // Optimistic insert
    const tempMsg: ChatMessage = {
      id: 'temp_' + Date.now(),
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_avatar: currentUserAvatar || '',
      receiver_id: targetReceiverId,
      message: msgText,
      is_admin: isAdmin,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const res = await sendChatMessage({
      message: msgText,
      receiverId: targetReceiverId,
    });

    setSending(false);

    if (!res.success) {
      toast.error(res.error || 'Gửi tin nhắn thất bại');
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } else {
      loadMessages(targetReceiverId);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <Button
          onClick={() => {
            setIsOpen(true);
            if (isAdmin) setViewMode('LIST');
          }}
          size="lg"
          className="rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-13 gap-2.5 transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <span className="font-semibold text-sm">
            {isAdmin ? 'Quản lý Chat với Thành viên' : 'Hỗ trợ'}
          </span>
        </Button>
      )}

      {/* Chat Box Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[540px] bg-card border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-3.5 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {isAdmin && viewMode === 'CHAT' ? (
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors mr-1"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {isAdmin ? <Users className="h-4 w-4 text-white" /> : <Shield className="h-4 w-4 text-white" />}
                </div>
              )}

              <div className="min-w-0">
                <h4 className="font-bold text-sm leading-tight truncate">
                  {isAdmin
                    ? viewMode === 'CHAT' && selectedUser
                      ? selectedUser.userName
                      : 'Chọn Thành viên nhắn tin'
                    : 'Chat trực tiếp với Ban Quản Trị'}
                </h4>
                <p className="text-[11px] text-emerald-100 opacity-90 truncate">
                  {isAdmin
                    ? selectedUser
                      ? `Trạng thái: ${selectedUser.userStatus === 'PENDING' ? 'Chờ duyệt' : 'Thành viên'}`
                      : 'Danh sách các cuộc trò chuyện'
                    : 'Phản hồi và hỗ trợ duyệt tài khoản'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ADMIN CONVERSATION LIST VIEW */}
          {isAdmin && viewMode === 'LIST' ? (
            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-muted/20">
              <p className="text-xs font-bold text-muted-foreground px-1 mb-2">
                Thành viên & Người dùng chờ duyệt ({conversations.length}):
              </p>

              {loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-xs py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  Đang tải danh sách thành viên...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Chưa có cuộc trò chuyện nào.
                </div>
              ) : (
                conversations.map((conv) => {
                  const initials = conv.userName.slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={conv.userId}
                      type="button"
                      onClick={() => handleSelectUser(conv)}
                      className="w-full text-left p-3 rounded-2xl bg-card border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={conv.userAvatar} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                              {conv.userName}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1.5 py-0 ${
                                conv.userStatus === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {conv.userStatus === 'PENDING' ? 'Chờ duyệt' : 'Thành viên'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-emerald-600 font-semibold shrink-0">
                        Nhắn ➔
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* CHAT MESSAGES VIEW */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/20">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Đang tải tin nhắn...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-1">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">
                      {isAdmin ? `Nhắn với ${selectedUser?.userName}` : `Xin chào ${currentUserName.split(' ')[0]} 👋`}
                    </p>
                    <p className="text-xs">
                      {isAdmin
                        ? 'Chưa có tin nhắn nào trong cuộc trò chuyện này. Hãy gửi tin nhắn đầu tiên!'
                        : 'Bạn có thắc mắc hoặc cần admin duyệt tài khoản/hóa đơn? Gửi tin nhắn ngay bên dưới nhé!'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <Avatar className="h-7 w-7 shrink-0 mb-1">
                            <AvatarImage src={msg.sender_avatar} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {msg.sender_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                              : 'bg-card border text-foreground rounded-bl-none shadow-2xs'
                          }`}
                        >
                          {!isMe && (
                            <p className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400 mb-0.5 flex items-center gap-1">
                              {msg.is_admin && <Shield className="h-3 w-3 inline" />}
                              {msg.sender_name}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p
                            className={`text-[9px] mt-1 text-right ${
                              isMe ? 'text-emerald-100 opacity-80' : 'text-muted-foreground'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-3 border-t bg-card flex items-center gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    isAdmin && selectedUser
                      ? `Nhắn tin cho ${selectedUser.userName}...`
                      : 'Nhập tin nhắn...'
                  }
                  className="text-xs h-10 rounded-xl flex-1 focus-visible:ring-emerald-500"
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  size="sm"
                  className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
