-- Enhance profile_views with detailed tracking columns (same as analytics table)
-- Run this in your Supabase SQL editor

ALTER TABLE profile_views
  ADD COLUMN IF NOT EXISTS asn text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS browser_name text,
  ADD COLUMN IF NOT EXISTS browser_version text,
  ADD COLUMN IF NOT EXISTS os_name text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS language text;

-- Add index for sorting by date (useful for stats queries)
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at_desc
  ON profile_views(profile_id, viewed_at DESC);
