import React from 'react';

export function CourtSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="56" height="48" rx="6" fill="#10B981" />
      <rect x="8" y="12" width="48" height="40" stroke="white" strokeWidth="2.5" fill="none" />
      <line x1="32" y1="12" x2="32" y2="52" stroke="white" strokeWidth="2.5" strokeDasharray="3 3" />
      <line x1="8" y1="32" x2="56" y2="32" stroke="#FEF08A" strokeWidth="3" />
      <circle cx="32" cy="32" r="6" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function ShuttlecockSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Feather cone */}
      <path d="M16 16 L28 44 L36 44 L48 16 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
      <path d="M22 16 L30 44" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M42 16 L34 44" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M32 16 L32 44" stroke="#CBD5E1" strokeWidth="1.5" />
      <line x1="20" y1="26" x2="44" y2="26" stroke="#64748B" strokeWidth="2" />
      <line x1="24" y1="36" x2="40" y2="36" stroke="#64748B" strokeWidth="2" />
      {/* Cork base */}
      <path d="M26 44 C26 54, 38 54, 38 44 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
    </svg>
  );
}

export function DrinkSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Straw */}
      <path d="M36 6 L44 6 L34 24" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      {/* Cup lid */}
      <rect x="16" y="20" width="32" height="6" rx="3" fill="#3B82F6" />
      {/* Cup body */}
      <path d="M18 26 L22 56 C22 58, 42 58, 42 56 L46 26 Z" fill="#60A5FA" opacity="0.85" />
      {/* Liquid */}
      <path d="M20 34 L23 54 C23 55.5, 41 55.5, 41 54 L44 34 Z" fill="#0284C7" />
      {/* Ice cubes / bubbles */}
      <circle cx="28" cy="40" r="3" fill="white" opacity="0.7" />
      <circle cx="36" cy="46" r="2.5" fill="white" opacity="0.7" />
    </svg>
  );
}

export function WalletMoneySvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="48" height="36" rx="8" fill="#10B981" />
      <path d="M8 24 C8 24, 32 16, 56 24" stroke="#047857" strokeWidth="2" />
      <rect x="36" y="28" width="20" height="14" rx="4" fill="#F59E0B" />
      <circle cx="43" cy="35" r="3" fill="#FEF08A" />
    </svg>
  );
}

export function RecruitMemberSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="22" r="10" fill="#10B981" />
      <path d="M12 50 C12 38, 40 38, 40 50 Z" fill="#059669" />
      <circle cx="46" cy="26" r="7" fill="#3B82F6" />
      <path d="M38 52 C38 42, 54 42, 54 52 Z" fill="#2563EB" />
      <circle cx="48" cy="18" r="5" fill="#F59E0B" />
      <path d="M48 15 L48 21 M45 18 L51 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MatchVersusSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#F59E0B" opacity="0.2" />
      {/* Racket 1 */}
      <path d="M14 48 L28 34" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      <circle cx="34" cy="28" r="10" stroke="#EF4444" strokeWidth="3" fill="none" />
      {/* Racket 2 */}
      <path d="M50 48 L36 34" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="30" cy="28" r="10" stroke="#3B82F6" strokeWidth="3" fill="none" />
      {/* VS Flash */}
      <path d="M32 14 L26 32 L36 32 L30 50" stroke="#F59E0B" strokeWidth="3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function TrophyStarSvgIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 12 H46 V28 C46 38, 38 44, 32 44 C26 44, 18 38, 18 28 Z" fill="#F59E0B" />
      <path d="M14 16 C8 16, 8 28, 18 28" stroke="#D97706" strokeWidth="3" fill="none" />
      <path d="M50 16 C56 16, 56 28, 46 28" stroke="#D97706" strokeWidth="3" fill="none" />
      <rect x="26" y="44" width="12" height="10" fill="#B45309" />
      <rect x="20" y="54" width="24" height="6" rx="2" fill="#78350F" />
      <polygon points="32,18 35,24 41,25 37,29 38,35 32,32 26,35 27,29 23,25 29,24" fill="#FEF08A" />
    </svg>
  );
}
