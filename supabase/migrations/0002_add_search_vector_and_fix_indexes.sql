/**
 * MODULE: Search Vector and Index Improvements
 *
 * Responsibility:
 * Adds full-text search capability to tasks table via search_vector column
 * and creates performance-optimizing indexes for RLS and common query patterns.
 *
 * Boundaries:
 * - Schema changes and index creation only; no data migration logic.
 * - Trigger-based search_vector updates (later replaced by GENERATED column).
 *
 * Critical invariants:
 * - search_vector automatically updates on title/description changes.
 * - Composite indexes start with workspace_id to optimize RLS queries.
 * - Foreign key constraint for parentId prevents orphaned subtasks.
 *
 * Side effects:
 * - Adds column and indexes to tasks table, affecting write performance.
 * - Creates trigger for automatic search_vector updates.
 *
 * Change risk:
 * - Medium. Index additions improve performance but increase storage.
 * - Trigger adds overhead to task updates.
 *
 * Links:
 * - packages/database/src/schema/work.ts (tasks table definition)
 *
 * Tags:
 * - domain: database
 * - risk: medium
 * - layer: performance
 * - stability: stable
 * - concerns: search, indexes, fts
 *
 * File:
 * - supabase/migrations/0002_add_search_vector_and_fix_indexes.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Add search_vector column to tasks for full-text search
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger to automatically update search_vector on title/description changes
CREATE OR REPLACE FUNCTION tasks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_search_vector_trigger ON tasks;
CREATE TRIGGER tasks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_update();

-- Add missing composite indexes for RLS performance
-- These indexes start with workspace_id to optimize RLS policy queries
CREATE INDEX IF NOT EXISTS tasks_workspace_id_project_id_idx ON tasks(workspace_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_workspace_id_status_idx ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS projects_workspace_id_name_idx ON projects(workspace_id, name);

-- Add foreign key constraint for parentId (self-reference)
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES tasks(id) 
  ON DELETE SET NULL;

-- Update existing rows to populate search_vector
UPDATE tasks SET search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')) 
WHERE search_vector IS NULL;
