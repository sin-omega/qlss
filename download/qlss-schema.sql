-- QLSS Database Setup for Supabase
-- Run this in Supabase SQL Editor to set up fresh tables
-- Drop existing tables first if you need a clean start

-- Drop existing tables (reverse dependency order)
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS links CASCADE;

-- Links table
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics table (click tracking)
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  ip_address TEXT,
  asn TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT,
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT,
  is_bot BOOLEAN,
  referer TEXT,
  language TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_analytics_link_id ON analytics(link_id);
CREATE INDEX idx_analytics_clicked_at ON analytics(clicked_at);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for links
-- Anyone can read links (needed for redirect route)
CREATE POLICY "Public read links" ON links FOR SELECT USING (true);

-- Service role bypasses RLS automatically, but explicit policy:
CREATE POLICY "Service role full access links" ON links FOR ALL USING (true);

-- RLS Policies for analytics
CREATE POLICY "Service role full access analytics" ON analytics FOR ALL USING (true);
