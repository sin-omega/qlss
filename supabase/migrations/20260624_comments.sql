-- Comments table with Reddit-style threading
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'anonymous',
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_link_id ON comments(link_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

ALTER TABLE links ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true NOT NULL;
ALTER TABLE links ADD COLUMN IF NOT EXISTS comments_registered_only boolean DEFAULT true NOT NULL;
