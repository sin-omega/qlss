-- Fix increment_use_count to run with owner privileges (SECURITY DEFINER)
-- so it works even when called via the anon key.
-- Also adds banned_slugs table for DB-managed reserved slugs.

-- 1. Fix increment_use_count RPC
CREATE OR REPLACE FUNCTION increment_use_count(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE links SET use_count = use_count + 1 WHERE id = link_id;
END;
$$;

-- 2. banned_slugs table
CREATE TABLE IF NOT EXISTS banned_slugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE banned_slugs ENABLE ROW LEVEL SECURITY;

-- Anyone can read banned_slugs (needed during link creation)
DROP POLICY IF EXISTS "banned_slugs_public_read" ON banned_slugs;
CREATE POLICY "banned_slugs_public_read" ON banned_slugs
  FOR SELECT TO anon, authenticated USING (true);

-- Seed system slugs (same as the hardcoded RESERVED_SLUGS set)
INSERT INTO banned_slugs (slug) VALUES
  ('api'), ('auth'), ('stats'), ('links'), ('login'), ('signin'),
  ('signup'), ('logout'), ('admin'), ('_next'), ('favicon.ico'),
  ('robots.txt'), ('sitemap.xml'), ('manifest.json'), ('site.webmanifest')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_banned_slugs_slug ON banned_slugs (slug);
