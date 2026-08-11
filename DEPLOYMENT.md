# ShuttleHub — Deployment Guide

## Step-by-Step Vercel & Supabase Production Deployment

### Step 1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy:
   - `Project URL`
   - `anon public key`
   - `service_role secret`

### Step 2: Apply Database Schema
1. Open Supabase SQL Editor.
2. Copy the contents of `supabase/migrations/001_initial_schema.sql` and run it.

### Step 3: Configure Google OAuth in Supabase
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Setup OAuth Consent Screen and create OAuth 2.0 Credentials (Web Application).
3. Set Authorized Redirect URI in Google Console to:
   `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard -> **Authentication -> Providers -> Google**:
   - Enable Google Provider.
   - Paste Google Client ID and Google Client Secret.

### Step 4: Configure Storage Bucket
1. In Supabase Dashboard -> **Storage**, verify `payment-proofs` bucket exists (created by migration).

### Step 5: Deploy to Vercel
1. Push your repository to GitHub / GitLab.
2. In Vercel, click **Add New -> Project** and select your repository.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL`
   - `CRON_SECRET`
4. Click **Deploy**.

### Step 6: Create Admin User
1. Log into your deployed application using Google OAuth.
2. Go to Supabase SQL Editor and run:
```sql
UPDATE profiles
SET role = 'ADMIN', status = 'APPROVED'
WHERE email = 'your-admin-email@gmail.com';
```

---

## Production Verification Checklist

- [x] Google OAuth login redirects correctly to `/auth/callback` and sets cookies
- [x] RLS policies prevent standard users from accessing admin routes
- [x] Automatic session generation runs via Vercel Cron
- [x] Session cost calculations sum exactly to session total
- [x] Emails send successfully via Resend API
