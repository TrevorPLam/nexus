-- Improve PostgreSQL Full-Text Search implementation for tasks table
-- Based on best practices: use GENERATED column instead of trigger, add GIN index

-- Drop existing trigger (we'll use GENERATED column instead)
DROP TRIGGER IF EXISTS tasks_search_vector_trigger ON tasks;
DROP FUNCTION IF EXISTS tasks_search_vector_update();

-- Re-create search_vector as a GENERATED column (PostgreSQL 12+)
-- This automatically updates when title or description changes
ALTER TABLE tasks
  ALTER COLUMN search_vector SET DATA TYPE tsvector
  USING (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  );

-- Set as GENERATED ALWAYS to maintain automatically
ALTER TABLE tasks
  ALTER COLUMN search_vector
  SET GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  ) STORED;

-- Add GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS tasks_search_vector_idx ON tasks USING GIN (search_vector);

-- Update existing rows to populate search_vector
UPDATE tasks
SET search_vector = (
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
)
WHERE search_vector IS NULL;
