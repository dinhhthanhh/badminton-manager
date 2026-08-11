# ShuttleHub — Database Schema Documentation

## Overview

The database is built on Supabase PostgreSQL with strict Row Level Security (RLS), CASCADE constraints, automatic triggers, and indexing optimized for session management and payment operations.

---

## Entity Relationship Diagram (Conceptual)

```
auth.users (Supabase Auth)
    └── profiles (1:1)
         ├── recurring_schedules (1:N, created_by)
         ├── sessions (1:N, created_by)
         ├── registrations (1:N, user_id)
         ├── payments (1:N, user_id)
         ├── notifications (1:N, user_id)
         └── audit_logs (1:N, actor_id)

sessions
    ├── session_costs (1:1)
    ├── registrations (1:N)
    └── payments (1:N)
```

---

## Detailed Table Specifications

### 1. `profiles`
Extends `auth.users` with custom role and registration status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, FK → `auth.users(id)` | Auth user ID |
| `email` | `TEXT` | UNIQUE, NOT NULL | User email address |
| `full_name` | `TEXT` | NOT NULL | User's full name |
| `avatar_url` | `TEXT` | NULL | Google OAuth avatar URL |
| `role` | `TEXT` | NOT NULL, DEFAULT `'USER'` | `'USER'` or `'ADMIN'` |
| `status` | `TEXT` | NOT NULL, DEFAULT `'PENDING'` | `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'BLOCKED'` |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `now()` | Last profile update |

### 2. `recurring_schedules`
Weekly templates for session generation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | Schedule ID |
| `day_of_week` | `INTEGER` | CHECK `0..6` | 0=Sun, 1=Mon, ..., 6=Sat |
| `start_time` | `TIME` | NOT NULL | Session start time |
| `end_time` | `TIME` | NOT NULL | Session end time |
| `court_name` | `TEXT` | NOT NULL | Court location/identifier |
| `is_active` | `BOOLEAN` | DEFAULT `true` | Schedule toggle |
| `created_by` | `UUID` | FK → `profiles(id)` | Admin creator |

### 3. `sessions`
Actual playing session instances.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | Session ID |
| `recurring_schedule_id` | `UUID` | FK → `recurring_schedules(id)` | Template reference |
| `date` | `DATE` | NOT NULL | Session date (YYYY-MM-DD) |
| `start_time` | `TIME` | NOT NULL | Start time |
| `end_time` | `TIME` | NOT NULL | End time |
| `court_name` | `TEXT` | NOT NULL | Court location |
| `status` | `TEXT` | NOT NULL | Status enum |
| `max_players` | `INTEGER` | NULL | Maximum allowed players |
| `registration_open_at` | `TIMESTAMPTZ` | NULL | Calculated open time |
| `registration_close_at` | `TIMESTAMPTZ` | NULL | Calculated close time |
| `notes` | `TEXT` | NULL | Optional notes |

### 4. `registrations`
User session signups and attendance records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | Registration ID |
| `session_id` | `UUID` | FK → `sessions(id)` ON DELETE CASCADE | Session reference |
| `user_id` | `UUID` | FK → `profiles(id)` ON DELETE CASCADE | User reference |
| `status` | `TEXT` | NOT NULL | `'REGISTERED'`, `'CANCELLED'`, `'ATTENDED'`, `'ABSENT'`, `'NO_SHOW'` |
| `cancelled_at` | `TIMESTAMPTZ` | NULL | Cancellation timestamp |
| `cancellation_reason` | `TEXT` | NULL | User reason |
| `cancellation_type` | `TEXT` | NULL | `'EARLY'` or `'LATE'` |
| `sets_played` | `INTEGER` | DEFAULT `0` | Recorded set count |

### 5. `session_costs`
Session expense records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Cost record ID |
| `session_id` | `UUID` | UNIQUE, FK → `sessions(id)` | Session reference |
| `court_cost` | `BIGINT` | DEFAULT `0` | Court rental cost in VND |
| `shuttlecock_cost` | `BIGINT` | DEFAULT `0` | Shuttlecock cost in VND |
| `other_cost` | `BIGINT` | DEFAULT `0` | Incidentals cost in VND |
| `total_cost` | `BIGINT` | GENERATED | `court_cost + shuttlecock_cost + other_cost` |
| `calculation_method` | `TEXT` | DEFAULT `'HYBRID'` | `'EQUAL'`, `'BY_SET'`, `'HYBRID'` |

### 6. `payments`
Individual financial settlement records created upon session finalization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Payment ID |
| `session_id` | `UUID` | FK → `sessions(id)` | Session reference |
| `user_id` | `UUID` | FK → `profiles(id)` | User reference |
| `court_share` | `BIGINT` | DEFAULT `0` | Individual court share |
| `shuttlecock_share` | `BIGINT` | DEFAULT `0` | Individual shuttle share |
| `other_share` | `BIGINT` | DEFAULT `0` | Individual other share |
| `total_amount` | `BIGINT` | DEFAULT `0` | Individual total in VND |
| `status` | `TEXT` | DEFAULT `'PENDING'` | `'PENDING'`, `'PAID'`, `'VERIFIED'`, `'REJECTED'` |
| `proof_url` | `TEXT` | NULL | Supabase Storage proof path |

---

## Security (RLS) Rules Summary

- **Public/Anon**: No direct access to internal tables.
- **Pending Users**: Restricted to reading own profile.
- **Approved Users**: Can view approved profiles, schedules, sessions, registrations, own payments, and own notifications.
- **Admins**: Full read/write access to all tables, user status updates, session cost input, attendance marking, and finalization.
