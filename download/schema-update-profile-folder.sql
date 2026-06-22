-- ============================================================================
-- QLSS — schema update: profile page folder
-- Run this in the Supabase SQL Editor ONCE. Safe to re-run.
-- ============================================================================

-- Add a boolean flag to mark a folder as the "profile page" folder.
-- Only one folder per user can have this set to true.
alter table public.folders
  add column if not exists profile_page boolean not null default false;

-- Ensure only one profile_page folder per user (partial unique index)
create unique index if not exists folders_profile_page_one_per_user
  on public.folders (user_id)
  where profile_page = true;
