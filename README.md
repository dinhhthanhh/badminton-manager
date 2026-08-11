# ShuttleHub — Badminton Club Management System

**ShuttleHub** is a production-ready, full-stack web application designed for managing badminton clubs. It automates recurring weekly session generation, registration deadlines, attendance tracking, set count recording, automatic multi-factor cost splitting (court + shuttlecocks + other), payment verification, email notifications, and administrative reporting.

---

## Technical Architecture & Stack

- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Custom Emerald Badminton Theme)
- **Icons**: Lucide Icons
- **Charts**: Recharts
- **Forms & Validation**: React Hook Form + Zod
- **Database & Backend**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google OAuth
- **Storage**: Supabase Storage (`payment-proofs` bucket)
- **Email**: Resend API with HTML templates
- **Testing**: Vitest (Unit tests for cost algorithms, rounding invariants, and date math)
- **Deployment**: Vercel + Vercel Cron

---

## Key Business Logic & Algorithms

### 1. Registration Rules & Timings
- **Open Rule**: Registration opens automatically $N$ hours before session start (default: 48 hours).
- **Close Rule**: Registration closes $M$ hours before session start (default: 1 hour).
- **Cancellation Rule**: Cancellations within $X$ hours of session start (default: 6 hours) are automatically categorized as `LATE`, allowing admins to audit no-shows and late drops.

### 2. Automatic Cost Calculation & Invariants
Supported calculation modes:
1. **HYBRID (Default)**:
   - **Court Cost**: Split evenly among attendees using the largest-remainder method.
   - **Shuttlecock Cost**: Split proportionally to sets played using the largest-remainder method.
   - **Other Cost**: Split evenly among attendees.
2. **EQUAL**: All costs split evenly among attendees.
3. **BY_SET**: All costs split proportionally by sets played.

**Financial Invariant Guaranteed**:
$$\sum_{i=1}^{N} \text{user\_total}_i = \text{court\_cost} + \text{shuttlecock\_cost} + \text{other\_cost}$$
All money math uses integer VND arithmetic without floating-point rounding discrepancies.

---

## Getting Started Locally

### 1. Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier works)
- A Google Cloud OAuth client
- A Resend API key (optional for local testing; emails fallback to console logs if missing)

### 2. Installation
```bash
git clone <repository-url>
cd badminton-manager
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the required values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_123456789
EMAIL_FROM=ShuttleHub <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-cron-secret
```

### 4. Supabase Setup
1. Go to your Supabase project SQL Editor.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. In Supabase Auth -> Providers -> Google, enable Google OAuth and add your Google Client ID and Secret.
4. Set Redirect URL in Supabase Auth to: `http://localhost:3000/auth/callback` (and your Vercel URL in production).

### 5. Create Initial Admin User
1. Start the app (`npm run dev`) and sign in with your Google account.
2. Open Supabase SQL Editor and elevate your user profile to ADMIN:
```sql
UPDATE profiles 
SET role = 'ADMIN', status = 'APPROVED' 
WHERE email = 'your-email@gmail.com';
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Run Unit Tests
```bash
npm test
```

---

## Database Schema Overview

The database uses 9 primary tables with full foreign key constraints and RLS:

- `profiles`: User account data, role (`USER` | `ADMIN`), status (`PENDING` | `APPROVED` | `REJECTED` | `BLOCKED`).
- `recurring_schedules`: Weekly recurring session rules (e.g. Mon 19:00-21:00 Court A).
- `sessions`: Specific badminton session instances generated from schedules or created manually.
- `registrations`: Session signups tracking status (`REGISTERED`, `CANCELLED`, `ATTENDED`, `ABSENT`, `NO_SHOW`), cancellation reason, and sets played.
- `session_costs`: Court, shuttlecock, and other cost tracking per session.
- `payments`: Individual user payment breakdown, status (`PENDING`, `PAID`, `VERIFIED`, `REJECTED`), and proof URL.
- `notifications`: In-app notification center feed.
- `audit_logs`: Audit trail for sensitive administrative operations.
- `app_settings`: Central configuration stored in JSONB.

---

## Vercel Deployment

1. Push your code to GitHub.
2. Import the project into Vercel.
3. Add the environment variables from `.env.local` to Vercel Project Settings.
4. Deploy! Vercel will automatically configure the `/api/cron/generate-sessions` cron job based on `vercel.json`.

---

## License
MIT License.
