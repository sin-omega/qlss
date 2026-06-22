-- QLSS Migration v2 — Admin, Profiles, Abuse Reports, Site Config
-- Run this in Supabase SQL Editor to add admin tables to an existing QLSS install
-- SAFE TO RE-RUN — uses IF NOT EXISTS / DO blocks everywhere

-- ── Step 1: Create tables if they don't exist ──

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  banned_at TIMESTAMPTZ,
  banned_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id)
);

CREATE TABLE IF NOT EXISTS abuse_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_email TEXT,
  link_slug TEXT,
  message TEXT NOT NULL,
  ip_address TEXT,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Step 2: Add missing columns to existing profiles table ──
-- This must run BEFORE any index/policy that references these columns.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned_reason TEXT;
  END IF;
END $$;

-- ── Step 3: Default banner config ──

INSERT INTO site_config (key, value)
VALUES ('banner_text', 'Welcome to QLSS — a fast link shortener.')
ON CONFLICT (key) DO NOTHING;

-- ── Step 4: Auto-create profile trigger ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Step 5: Indexes (AFTER columns exist) ──

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_link_slug ON abuse_reports(link_slug);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reviewed ON abuse_reports(reviewed);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_created_at ON abuse_reports(created_at);

-- ── Step 6: Row Level Security ──

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- ── Step 7: RLS Policies ──

DO $$ BEGIN
  CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access abuse_reports" ON abuse_reports FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon insert abuse_reports" ON abuse_reports FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access site_config" ON site_config FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
