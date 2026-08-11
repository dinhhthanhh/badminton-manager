import type {
  UserRole,
  UserStatus,
  SessionStatus,
  RegistrationStatus,
  CancellationType,
  PaymentStatus,
  CostCalculationMethod,
  NotificationType,
} from '@/lib/config';

// ─── Profile ────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// ─── Recurring Schedule ──────────────────────────────────────────────
export interface RecurringSchedule {
  id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string;  // HH:mm:ss
  end_time: string;    // HH:mm:ss
  court_name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Session ─────────────────────────────────────────────────────────
export interface Session {
  id: string;
  recurring_schedule_id: string | null;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:mm:ss
  end_time: string;    // HH:mm:ss
  court_name: string;
  status: SessionStatus;
  max_players: number | null;
  registration_open_at: string | null;
  registration_close_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SessionWithDetails extends Session {
  registrations: RegistrationWithProfile[];
  session_costs: SessionCost | null;
  registration_count: number;
  attended_count: number;
}

// ─── Registration ────────────────────────────────────────────────────
export interface Registration {
  id: string;
  session_id: string;
  user_id: string;
  status: RegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancellation_type: CancellationType | null;
  sets_played: number;
  created_at: string;
  updated_at: string;
}

export interface RegistrationWithProfile extends Registration {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>;
}

// ─── Session Costs ──────────────────────────────────────────────────
export interface SessionCost {
  id: string;
  session_id: string;
  court_cost: number;
  shuttlecock_cost: number;
  other_cost: number;
  total_cost: number;
  calculation_method: CostCalculationMethod;
  created_at: string;
  updated_at: string;
}

// ─── Payment ─────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  session_id: string;
  user_id: string;
  court_share: number;
  shuttlecock_share: number;
  other_share: number;
  total_amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithDetails extends Payment {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>;
  sessions: Pick<Session, 'id' | 'date' | 'start_time' | 'end_time' | 'court_name'>;
}

// ─── Notification ────────────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── App Settings ────────────────────────────────────────────────────
export interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

// ─── User Statistics ─────────────────────────────────────────────────
export interface UserStats {
  totalSessions: number;
  attendedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  totalSetsPlayed: number;
  totalMoneySpent: number;
  outstandingMoney: number;
  averageSessionsPerMonth: number;
}

// ─── Admin Dashboard Stats ───────────────────────────────────────────
export interface AdminDashboardStats {
  totalMembers: number;
  pendingApprovals: number;
  upcomingSessions: number;
  todayAttendees: number;
  outstandingPayments: number;
  monthlyRevenue: number;
}

// ─── Availability Slot ────────────────────────────────────────────────
export interface AvailabilitySlot {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilitySlotWithProfile extends AvailabilitySlot {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>;
}

// ─── Cost Breakdown ──────────────────────────────────────────────────
export interface UserCostBreakdown {
  userId: string;
  userName: string;
  setsPlayed: number;
  courtShare: number;
  shuttlecockShare: number;
  otherShare: number;
  totalAmount: number;
}
