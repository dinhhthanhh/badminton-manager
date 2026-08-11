-- ===========================================
-- ShuttleHub Seed Data
-- Realistic Vietnamese test data
-- ===========================================

-- Note: Run this AFTER running migrations
-- The admin user must already exist via Google OAuth signup
-- Use the Supabase dashboard to manually set the first user's role to ADMIN

-- Example seed for development/testing
-- Replace the UUIDs below with actual auth.users IDs from your Supabase project

-- ─── Sample Recurring Schedules ──────────────────────────────────

-- To insert schedules, you need a valid admin user ID.
-- After creating your first admin through the app:

-- INSERT INTO recurring_schedules (day_of_week, start_time, end_time, court_name, created_by)
-- VALUES
--   (1, '19:00:00', '21:00:00', 'Court A - Quận 1', 'YOUR_ADMIN_USER_ID'),
--   (3, '19:00:00', '21:00:00', 'Court A - Quận 1', 'YOUR_ADMIN_USER_ID'),
--   (6, '15:00:00', '17:00:00', 'Court B - Quận 7', 'YOUR_ADMIN_USER_ID');

-- ─── Development Quick Setup ─────────────────────────────────────
-- 
-- 1. Sign up with Google (creates auth.users + profiles record)
-- 2. In Supabase SQL Editor, run:
--    UPDATE profiles SET role = 'ADMIN', status = 'APPROVED' WHERE email = 'your-email@gmail.com';
-- 3. Create recurring schedules via the admin UI
-- 4. Generate sessions via admin or cron endpoint

-- ─── Sample App Settings (already inserted by migration) ─────────
-- The migration creates default settings. You can update them:
-- UPDATE app_settings SET value = '72' WHERE key = 'registration_open_hours';
