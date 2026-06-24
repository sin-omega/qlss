ALTER TABLE links ADD COLUMN IF NOT EXISTS comments_registered_only boolean DEFAULT true NOT NULL;
