/**
 * MODULE: Work Constraints and Indexes
 *
 * Responsibility:
 * Adds missing database constraints and performance indexes for Work module
 * based on best practices for project management systems.
 *
 * Boundaries:
 * - Constraint and index creation only; no schema changes.
 * - Focuses on data integrity and query performance.
 *
 * Critical invariants:
 * - Unique constraint prevents duplicate task dependencies.
 * - Composite indexes optimize RLS and common query patterns.
 * - Partial indexes reduce storage for filtered queries.
 *
 * Side effects:
 * - Adds constraints that may fail on existing duplicate data.
 * - Adds indexes, increasing storage and write overhead.
 *
 * Change risk:
 * - Medium. Constraints may block invalid data writes.
 * - Indexes improve read performance at cost of write performance.
 *
 * Links:
 * - packages/database/src/schema/work.ts (Work tables)
 *
 * Tags:
 * - domain: database
 * - risk: medium
 * - layer: performance
 * - stability: stable
 * - concerns: constraints, indexes, performance
 *
 * File:
 * - supabase/migrations/0006_add_missing_constraints_and_indexes.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Add missing database constraints and indexes for Work module
-- Based on best practices for project management systems

-- Add unique constraint on (task_id, depends_on_task_id) to prevent duplicate dependencies
-- This prevents the same dependency from being created twice
ALTER TABLE task_dependencies
  ADD CONSTRAINT task_dependencies_unique_pair
  UNIQUE (task_id, depends_on_task_id);

-- Add index for task dependencies to improve performance
CREATE INDEX IF NOT EXISTS task_dependencies_task_id_idx ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS task_dependencies_depends_on_task_id_idx ON task_dependencies(depends_on_task_id);

-- Add composite index for workspace_memberships to improve RLS performance
CREATE INDEX IF NOT EXISTS workspace_memberships_user_id_idx ON workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS workspace_memberships_workspace_id_user_id_idx ON workspace_memberships(workspace_id, user_id);

-- Add index for task assignees to improve query performance
CREATE INDEX IF NOT EXISTS task_assignees_task_id_idx ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS task_assignees_user_id_idx ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS task_assignees_workspace_id_idx ON task_assignees(task_id)
  FROM tasks WHERE tasks.id = task_assignees.task_id;

-- Add index for task comments to improve query performance
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_user_id_idx ON task_comments(user_id);

-- Add index for task attachments to improve query performance
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS task_attachments_uploaded_by_idx ON task_attachments(uploaded_by);

-- Add index for task notes to improve query performance
CREATE INDEX IF NOT EXISTS task_notes_task_id_idx ON task_notes(task_id);

-- Add index for time entries to improve query performance
CREATE INDEX IF NOT EXISTS time_entries_task_id_idx ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_started_at_idx ON time_entries(started_at);

-- Add partial index for active tasks (common query pattern)
CREATE INDEX IF NOT EXISTS tasks_active_idx ON tasks(workspace_id, status, priority)
  WHERE status IN ('todo', 'in_progress');

-- Add partial index for tasks with due dates (common query pattern)
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(workspace_id, due_date)
  WHERE due_date IS NOT NULL;

-- Add partial index for completed tasks
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON tasks(workspace_id, completed_at)
  WHERE status = 'done';
