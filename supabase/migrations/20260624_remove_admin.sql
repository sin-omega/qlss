-- Remove admin panel infrastructure
-- Run this in Supabase SQL editor when ready.

-- 1. Remove is_admin column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- 2. Drop admin-related tables if they exist
DROP TABLE IF EXISTS admin_audit_log;

-- (Optional) Also remove ban tracking if you want a clean slate --
-- ALTER TABLE profiles DROP COLUMN IF EXISTS banned;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS banned_at;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS banned_reason;
-- DROP TABLE IF EXISTS banned_ips;
