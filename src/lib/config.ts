/**
 * Central application configuration.
 * Change branding, defaults, and business rules here.
 */

export const APP_CONFIG = {
  name: 'ShuttleHub',
  subtitle: 'Hệ thống Quản lý Câu lạc bộ Cầu lông',
  description: 'Quản lý câu lạc bộ cầu lông của bạn một cách dễ dàng. Lên lịch, đăng ký, tham gia và tự động chia chi phí.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

export const TIMEZONE = 'Asia/Ho_Chi_Minh' as const;

export const CURRENCY = {
  code: 'VND',
  symbol: '₫',
  locale: 'vi-VN',
} as const;

export const DEFAULT_SETTINGS = {
  registrationOpenHours: 48,
  registrationCloseHours: 1,
  lateCancellationHours: 6,
  defaultSessionDurationMinutes: 120,
  defaultMaxPlayers: null as number | null,
  defaultCalculationMethod: 'HYBRID' as CostCalculationMethod,
  sessionGenerationWeeksAhead: 4,
} as const;

export type CostCalculationMethod = 'EQUAL' | 'BY_SET' | 'HYBRID';

export type UserRole = 'USER' | 'ADMIN' | 'CLUB_OWNER';

export type SkillLevel = 'BEGINNER' | 'AMATEUR' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'PRO';

export const SKILL_LEVEL_LABELS: Record<SkillLevel, { label: string; color: string }> = {
  BEGINNER: { label: 'Mới chơi', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  AMATEUR: { label: 'Yếu - Trung bình yếu', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  INTERMEDIATE: { label: 'Trung bình (Phong trào)', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ADVANCED: { label: 'Khá - Trung bình khá', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  EXPERT: { label: 'Giỏi / Bán chuyên', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  PRO: { label: 'Chuyên nghiệp', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export type PostType = 'RECRUIT_MEMBER' | 'FIND_OPPONENT' | 'GENERAL';

export const POST_TYPE_LABELS: Record<PostType, { label: string; badge: string; color: string }> = {
  RECRUIT_MEMBER: { label: 'Tuyển thành viên CLB', badge: 'Tuyển thành viên', color: 'bg-emerald-500 text-white' },
  FIND_OPPONENT: { label: 'Tuyển đối giao lưu', badge: 'Tìm đối giao lưu', color: 'bg-blue-500 text-white' },
  GENERAL: { label: 'Thông báo / Thảo luận', badge: 'Thông báo', color: 'bg-amber-500 text-white' },
};

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

export type SessionStatus =
  | 'UPCOMING'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FINALIZED'
  | 'CANCELLED';

export type RegistrationStatus =
  | 'REGISTERED'
  | 'CANCELLED'
  | 'ATTENDED'
  | 'ABSENT'
  | 'NO_SHOW';

export type CancellationType = 'EARLY' | 'LATE';

export type PaymentStatus = 'PENDING' | 'PAID' | 'VERIFIED' | 'REJECTED';

export type NotificationType =
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CONFIRMED'
  | 'SESSION_REMINDER'
  | 'PAYMENT_REQUEST'
  | 'PAYMENT_VERIFIED'
  | 'CANCELLATION_CONFIRMED';

export const TIME_SLOTS_1H = [
  { start: '06:00:00', end: '07:00:00', label: '06:00 - 07:00' },
  { start: '07:00:00', end: '08:00:00', label: '07:00 - 08:00' },
  { start: '08:00:00', end: '09:00:00', label: '08:00 - 09:00' },
  { start: '09:00:00', end: '10:00:00', label: '09:00 - 10:00' },
  { start: '10:00:00', end: '11:00:00', label: '10:00 - 11:00' },
  { start: '11:00:00', end: '12:00:00', label: '11:00 - 12:00' },
  { start: '12:00:00', end: '13:00:00', label: '12:00 - 13:00' },
  { start: '13:00:00', end: '14:00:00', label: '13:00 - 14:00' },
  { start: '14:00:00', end: '15:00:00', label: '14:00 - 15:00' },
  { start: '15:00:00', end: '16:00:00', label: '15:00 - 16:00' },
  { start: '16:00:00', end: '17:00:00', label: '16:00 - 17:00' },
  { start: '17:00:00', end: '18:00:00', label: '17:00 - 18:00' },
  { start: '18:00:00', end: '19:00:00', label: '18:00 - 19:00' },
  { start: '19:00:00', end: '20:00:00', label: '19:00 - 20:00' },
  { start: '20:00:00', end: '21:00:00', label: '20:00 - 21:00' },
  { start: '21:00:00', end: '22:00:00', label: '21:00 - 22:00' },
] as const;

export const CROWD_LEVELS = {
  LOW: { max: 4, label: 'Thưa', color: 'emerald' },
  MEDIUM: { max: 8, label: 'Vừa', color: 'amber' },
  CROWDED: { max: 12, label: 'Đông', color: 'orange' },
  FULL: { max: Infinity, label: 'Đầy', color: 'red' },
} as const;

export function getCrowdLevel(count: number, maxPlayers: number | null) {
  if (maxPlayers && count >= maxPlayers) return CROWD_LEVELS.FULL;
  if (count <= CROWD_LEVELS.LOW.max) return CROWD_LEVELS.LOW;
  if (count <= CROWD_LEVELS.MEDIUM.max) return CROWD_LEVELS.MEDIUM;
  if (count <= CROWD_LEVELS.CROWDED.max) return CROWD_LEVELS.CROWDED;
  return CROWD_LEVELS.FULL;
}
