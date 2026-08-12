'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/config';
import type { Profile } from '@/types';
import { Search, UserCheck, Trophy, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface Props {
  users: Profile[];
  currentUserId: string;
}

export function UsersSearchClient({ users, currentUserId }: Props) {
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('ALL');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesSkill =
      selectedSkill === 'ALL' || (u.skill_level || 'INTERMEDIATE') === selectedSkill;

    return matchesSearch && matchesSkill;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc email người chơi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">Tất cả trình độ</option>
            {Object.entries(SKILL_LEVEL_LABELS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
        <span>Tìm thấy {filteredUsers.length} người chơi</span>
      </div>

      {/* Grid of Users */}
      {filteredUsers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Không tìm thấy người chơi nào phù hợp với từ khóa tìm kiếm.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isMe = user.id === currentUserId;
            const initials = user.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const skillInfo = SKILL_LEVEL_LABELS[user.skill_level || 'INTERMEDIATE'] || SKILL_LEVEL_LABELS.INTERMEDIATE;

            return (
              <Card
                key={user.id}
                className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-emerald-500/20 shrink-0">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm sm:text-base truncate">{user.full_name}</p>
                        {isMe && (
                          <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700">
                            Bạn
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge className={`${skillInfo.color} text-[10px]`}>
                      🏸 {skillInfo.label}
                    </Badge>
                    {user.role === 'CLUB_OWNER' && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
                        👑 Chủ CLB
                      </Badge>
                    )}
                  </div>

                  {user.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      &quot;{user.bio}&quot;
                    </p>
                  )}

                  <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/30 p-2.5 rounded-xl border">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{user.play_frequency || 'Tần suất: Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {(user.preferred_time_slots && user.preferred_time_slots.length > 0)
                          ? user.preferred_time_slots[0]
                          : 'Tối T2, T4, T6 (18h-21h)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t">
                  <Link href={`/explore/users/${user.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1 border-emerald-500/30 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" /> Xem Profile & Đánh giá
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
