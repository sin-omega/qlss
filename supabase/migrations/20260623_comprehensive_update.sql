-- ============================================================================
-- QLSS — Comprehensive platform update migration
-- Date: 2026-06-23
-- Adds: link expiry/max_uses/use_count, markdown link type, OG meta,
--       username + tos_accepted on profiles, banned_usernames + banned_ips tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- links table additions
-- ---------------------------------------------------------------------------
ALTER TABLE links ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE links ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE links ADD COLUMN IF NOT EXISTS use_count integer DEFAULT 0 NOT NULL;
ALTER TABLE links ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'redirect' NOT NULL;
ALTER TABLE links ADD COLUMN IF NOT EXISTS markdown_content text;
ALTER TABLE links ADD COLUMN IF NOT EXISTS og_title text;
ALTER TABLE links ADD COLUMN IF NOT EXISTS og_description text;
ALTER TABLE links ADD COLUMN IF NOT EXISTS og_image text;

-- Ensure use_count cannot go negative
ALTER TABLE links ADD CONSTRAINT links_use_count_non_negative
  CHECK (use_count >= 0) NOT VALID;

-- link_type allowed values
ALTER TABLE links ADD CONSTRAINT links_link_type_check
  CHECK (link_type IN ('redirect', 'markdown')) NOT VALID;

-- ---------------------------------------------------------------------------
-- profiles table additions (username + tos_accepted)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_accepted boolean DEFAULT false NOT NULL;

-- Username format constraint: letters, numbers, underscores; 3–30 chars
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,30}$') NOT VALID;

-- ---------------------------------------------------------------------------
-- banned_usernames — reserved usernames that cannot be claimed on onboarding
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banned_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Seed a few obvious reserved usernames
INSERT INTO banned_usernames (username)
VALUES
  ('admin'), ('administrator'), ('root'), ('superuser'),
  ('qlss'), ('support'), ('help'), ('info'), ('contact'),
  ('api'), ('system'), ('official'), ('moderator'), ('mod')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- banned_ips — IP addresses blocked at the middleware layer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  reason text,
  banned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links (expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_links_link_type ON links (link_type);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip_address ON banned_ips (ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_usernames_username ON banned_usernames (username);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE banned_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;

-- banned_usernames / banned_ips are readable by anon (needed during onboarding
-- and middleware lookups) but only writable by service role / admins.
DROP POLICY IF EXISTS "banned_usernames_public_read" ON banned_usernames;
CREATE POLICY "banned_usernames_public_read" ON banned_usernames
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "banned_ips_public_read" ON banned_ips;
CREATE POLICY "banned_ips_public_read" ON banned_ips
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Updated_at trigger for profiles (optional convenience)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to profiles if missing, then the trigger
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- increment_use_count(link_id) — atomic counter used by the [slug] resolver
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_use_count(link_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE links SET use_count = use_count + 1 WHERE id = link_id;
END;
$$ LANGUAGE plpgsql;
