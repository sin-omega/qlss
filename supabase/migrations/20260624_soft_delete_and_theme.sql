-- Soft-delete column for links (prevents link squatting after deletion)
ALTER TABLE links ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false NOT NULL;
CREATE INDEX IF NOT EXISTS idx_links_not_deleted ON links (slug) WHERE deleted = false;
