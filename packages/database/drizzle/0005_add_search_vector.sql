-- Add search_vector column to tasks table
ALTER TABLE "tasks" ADD COLUMN "search_vector" tsvector;

-- Create GIN index on search_vector for full-text search
CREATE INDEX "tasks_search_vector_idx" ON "tasks" USING gin ("search_vector");

-- Create trigger to automatically update search_vector on insert/update
CREATE OR REPLACE FUNCTION tasks_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_update BEFORE INSERT OR UPDATE ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_trigger();

-- Update existing rows
UPDATE "tasks" SET "search_vector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B');
