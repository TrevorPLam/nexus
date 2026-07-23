-- Add database triggers to automatically update the searchVector column
-- This ensures full-text search stays up-to-date when task content changes

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search_vector on INSERT
CREATE TRIGGER task_search_vector_insert_trigger
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_search_vector();

-- Create trigger to update search_vector on UPDATE
CREATE TRIGGER task_search_vector_update_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.description IS DISTINCT FROM NEW.description)
  EXECUTE FUNCTION update_task_search_vector();

-- Create trigger to update search_vector on UPDATE of title or description
DROP TRIGGER IF EXISTS task_search_vector_update_trigger ON tasks;
CREATE TRIGGER task_search_vector_update_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.description IS DISTINCT FROM NEW.description)
  EXECUTE FUNCTION update_task_search_vector();

-- Create an index on the search_vector for faster full-text search
CREATE INDEX IF NOT EXISTS tasks_search_vector_idx ON tasks USING GIN (search_vector);

-- Create a function to update existing rows that don't have search_vector populated
-- This should be run once after the migration is applied
CREATE OR REPLACE FUNCTION populate_task_search_vectors()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
  WHERE search_vector IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the function to populate existing rows
SELECT populate_task_search_vectors();
