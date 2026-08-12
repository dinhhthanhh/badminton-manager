-- ===================================================
-- Migration 002: Multi-Club, Profiles Extension, Posts & Ratings
-- ===================================================

-- 1. Profiles Extension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'INTERMEDIATE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS play_frequency TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_time_slots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Update role constraint to include CLUB_OWNER
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('USER', 'ADMIN', 'CLUB_OWNER'));

-- 2. Clubs Table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Club Members Table
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  invited_by UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 4. Sessions & Recurring Schedules extension
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_schedules ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

-- 5. Posts Table (Recruitment, Find Opponents, Announcements)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('RECRUIT_MEMBER', 'FIND_OPPONENT', 'GENERAL')),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  skill_level_required TEXT,
  preferred_time TEXT,
  location TEXT,
  contact_info TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_REVIEW', 'HIDDEN', 'DELETED')),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  categories JSONB DEFAULT '{}'::jsonb, -- e.g. {"punctuality": 5, "payment": 5, "sportsmanship": 5}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rater_id, rated_user_id, club_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON public.posts(type, status);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON public.ratings(rated_user_id);

-- Triggers for updated_at
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
