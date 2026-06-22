-- Profile page views tracking table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS profile_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address text,
  country text,
  region text,
  city text,
  user_agent text,
  referer text,
  viewed_at timestamptz DEFAULT now()
);

-- Index for fast counting
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);

-- RLS (viewers can insert, only profile owner can read)
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public profile tracking)
CREATE POLICY "Anyone can insert profile views"
  ON profile_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow profile owners to read their own views
CREATE POLICY "Profile owners can read own views"
  ON profile_views
  FOR SELECT
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
  );
