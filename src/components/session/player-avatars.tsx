'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RegistrationWithProfile } from '@/types';

interface PlayerAvatarsProps {
  registrations: RegistrationWithProfile[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

export function PlayerAvatars({ registrations, maxDisplay = 3, size = 'sm' }: PlayerAvatarsProps) {
  const active = registrations.filter((r) => r.status !== 'CANCELLED');
  const displayed = active.slice(0, maxDisplay);
  const remaining = active.length - maxDisplay;

  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const marginClass = size === 'sm' ? '-ml-2.5' : '-ml-3.5';

  return (
    <div className="flex items-center">
      <div className="flex items-center">
        {displayed.map((reg, i) => {
          const initials = reg.profiles?.full_name
            ? reg.profiles.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : '??';

          return (
            <Tooltip key={reg.id || i}>
              <TooltipTrigger>
                <div
                  className={`${i > 0 ? marginClass : ''} relative transition-transform hover:scale-110 hover:z-30`}
                  style={{ zIndex: maxDisplay - i }}
                >
                  <Avatar className={`${sizeClass} ring-2 ring-background shadow-xs`}>
                    <AvatarImage src={reg.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">{reg.profiles?.full_name || 'Thành viên'}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remaining > 0 && (
          <div
            className={`${marginClass} relative`}
            style={{ zIndex: 0 }}
          >
            <div
              className={`${sizeClass} rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center ring-2 ring-background font-bold text-[11px] shadow-xs`}
            >
              +{remaining}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
