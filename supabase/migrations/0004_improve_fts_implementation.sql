/**
 * MODULE: FTS Implementation Improvement
 *
 * Responsibility:
 * Improves PostgreSQL Full-Text Search implementation by replacing
 * trigger-based search_vector updates with GENERATED column and adding GIN index.
 *
 * Boundaries:
 * - FTS optimization only; no search logic changes.
 * - Replaces trigger with PostgreSQL 12+ GENERATED column feature.
 *
 * Critical invariants:
 * - search_vector is automatically maintained by database (GENERATED).
 * - Title weighted 'A' (higher relevance), description weighted 'B'.
 * - GIN index enables fast full-text search queries.
 *
 * Side effects:
 * - Drops existing trigger and function.
 * - Changes column to GENERATED, requiring PostgreSQL 12+.
 *
 * Change risk:
 * - Medium. Requires PostgreSQL 12+ for GENERATED columns.
 * - Improves performance and reduces trigger overhead.
 *
 * Links:
 * - packages/database/src/schema/work.ts (tasks table)
 *
 * Tags:
 * - domain: database
 * - risk: medium
 * - layer: performance
 * - stability: stable
 * - concerns: fts, generated-column, gin-index
 *
 * File:
 * - supabase/migrations/0004_improve_fts_implementation.sql
 *
 * Last updated:
 * - July 22, 2026
 */

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
