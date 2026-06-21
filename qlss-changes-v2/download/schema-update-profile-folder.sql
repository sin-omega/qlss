-- Migration: Add profile_settings table + profile_page column on folders + social links
-- Run this in Supabase SQL Editor

-- 1. Add profile_page column to folders (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'folders' AND column_name = 'profile_page'
  ) THEN
    ALTER TABLE folders ADD COLUMN profile_page boolean NOT NULL DEFAULT false;
    
    -- Partial unique index: only one profile_page folder per user
    CREATE UNIQUE INDEX folders_one_profile_page_per_user
      ON folders (user_id)
      WHERE profile_page = true;
  END IF;
END $$;

-- 2. Create profile_settings table for profile page customization
CREATE TABLE IF NOT EXISTS profile_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_color TEXT,
  display_name TEXT,
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 300),
  layout TEXT NOT NULL DEFAULT 'list' CHECK (layout IN ('list', 'grid', 'compact')),
  show_clicks boolean NOT NULL DEFAULT false,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on profile_settings
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for profile_settings
CREATE POLICY "Users can read their own profile_settings"
  ON profile_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile_settings"
  ON profile_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile_settings"
  ON profile_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Make profile_settings publicly readable (for profile page)
CREATE POLICY "Anyone can read profile_settings"
  ON profile_settings FOR SELECT
  USING (true);

-- 6. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_profile_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_settings_updated_at ON profile_settings;
CREATE TRIGGER profile_settings_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW EXECUTE FUNCTION update_profile_settings_updated_at();
