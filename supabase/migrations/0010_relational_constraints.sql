/**
 * MODULE: Relational and Workspace Constraints
 *
 * Responsibility:
 * Adds relational and workspace consistency constraints including missing foreign keys,
 * explicit delete actions, and composite foreign keys to prevent cross-workspace references.
 *
 * Boundaries:
 * - Constraint and index creation only; no schema changes.
 * - Uses NOT VALID + VALIDATE pattern for minimal downtime.
 *
 * Critical invariants:
 * - Composite foreign keys prevent cross-workspace references (e.g., tasks.projectId).
 * - Unique constraints on (id, workspace_id) enable composite FKs.
 * - Explicit delete actions (CASCADE, SET NULL) defined for all FKs.
 * - Self-reference FKs for tasks.parentId and taskComments.parentId.
 * - Cross-domain FKs for task-event linking (tasks.calendarEventId, events.taskId).
 *
 * Side effects:
 * - Adds constraints that may fail on existing invalid data.
 * - Uses NOT VALID + VALIDATE to minimize lock time.
 * - Adds indexes for composite FK performance.
 *
 * Change risk:
 * - High. Composite FKs enforce strict workspace isolation.
 * - May block cross-workspace data that previously existed.
 *
 * Links:
 * - packages/database/src/schema/work.ts (Work tables)
 * - packages/database/src/schema/calendar.ts (Calendar tables)
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: integrity
 * - stability: stable
 * - concerns: constraints, foreign-keys, workspace-isolation
 *
 * File:
 * - supabase/migrations/0010_relational_constraints.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Add relational and workspace consistency constraints
-- This migration adds missing foreign keys, explicit delete actions, and composite foreign keys
-- to prevent cross-workspace references. Uses NOT VALID + VALIDATE pattern for minimal downtime.

-- ============================================================================
-- Step 1: Add unique constraints for composite foreign key references
-- These are needed for composite FKs that reference (workspace_id, id)
-- ============================================================================

-- Add unique constraint on projects (id, workspace_id) for composite FKs
-- NOT VALID first to avoid full table scan during constraint creation
ALTER TABLE projects 
  ADD CONSTRAINT projects_id_workspace_unique UNIQUE (id, workspace_id) NOT VALID;

-- Validate the constraint in a separate transaction
ALTER TABLE projects VALIDATE CONSTRAINT projects_id_workspace_unique;

-- Add unique constraint on tasks (id, workspace_id) for composite FKs
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_id_workspace_unique UNIQUE (id, workspace_id) NOT VALID;

ALTER TABLE tasks VALIDATE CONSTRAINT tasks_id_workspace_unique;

-- Add unique constraint on calendars (id, workspace_id) for composite FKs
ALTER TABLE calendars 
  ADD CONSTRAINT calendars_id_workspace_unique UNIQUE (id, workspace_id) NOT VALID;

ALTER TABLE calendars VALIDATE CONSTRAINT calendars_id_workspace_unique;

-- Add unique constraint on events (id, workspace_id) for composite FKs
ALTER TABLE events 
  ADD CONSTRAINT events_id_workspace_unique UNIQUE (id, workspace_id) NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_id_workspace_unique;

-- ============================================================================
-- Step 2: Add missing self-reference foreign keys
-- ============================================================================

-- Add FK for tasks.parentId (self-reference for subtasks)
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE tasks VALIDATE CONSTRAINT tasks_parent_id_fkey;

-- Add FK for taskComments.parentId (self-reference for threaded replies)
ALTER TABLE task_comments 
  ADD CONSTRAINT task_comments_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_comments VALIDATE CONSTRAINT task_comments_parent_id_fkey;

-- ============================================================================
-- Step 3: Add missing cross-domain foreign keys
-- ============================================================================

-- Add FK for tasks.calendarEventId (cross-domain to events)
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_calendar_event_id_fkey 
  FOREIGN KEY (calendar_event_id) REFERENCES events(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE tasks VALIDATE CONSTRAINT tasks_calendar_event_id_fkey;

-- Add FK for events.taskId (cross-domain to tasks)
ALTER TABLE events 
  ADD CONSTRAINT events_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_task_id_fkey;

-- ============================================================================
-- Step 4: Add explicit delete actions to existing foreign keys
-- ============================================================================

-- Work module - task dependencies
ALTER TABLE task_dependencies 
  DROP CONSTRAINT task_dependencies_task_id_fkey;

ALTER TABLE task_dependencies 
  ADD CONSTRAINT task_dependencies_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_dependencies VALIDATE CONSTRAINT task_dependencies_task_id_fkey;

ALTER TABLE task_dependencies 
  DROP CONSTRAINT task_dependencies_depends_on_task_id_fkey;

ALTER TABLE task_dependencies 
  ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey 
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_dependencies VALIDATE CONSTRAINT task_dependencies_depends_on_task_id_fkey;

-- Work module - task notes
ALTER TABLE task_notes 
  DROP CONSTRAINT task_notes_task_id_fkey;

ALTER TABLE task_notes 
  ADD CONSTRAINT task_notes_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_notes VALIDATE CONSTRAINT task_notes_task_id_fkey;

-- Work module - task comments
ALTER TABLE task_comments 
  DROP CONSTRAINT task_comments_task_id_fkey;

ALTER TABLE task_comments 
  ADD CONSTRAINT task_comments_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_comments VALIDATE CONSTRAINT task_comments_task_id_fkey;

ALTER TABLE task_comments 
  DROP CONSTRAINT task_comments_user_id_fkey;

ALTER TABLE task_comments 
  ADD CONSTRAINT task_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_comments VALIDATE CONSTRAINT task_comments_user_id_fkey;

-- Work module - task assignees (assigned_by)
ALTER TABLE task_assignees 
  DROP CONSTRAINT task_assignees_assigned_by_fkey;

ALTER TABLE task_assignees 
  ADD CONSTRAINT task_assignees_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES app_users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE task_assignees VALIDATE CONSTRAINT task_assignees_assigned_by_fkey;

-- Calendar module - events workspace and calendar
ALTER TABLE events 
  DROP CONSTRAINT events_workspace_id_fkey;

ALTER TABLE events 
  ADD CONSTRAINT events_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_workspace_id_fkey;

ALTER TABLE events 
  DROP CONSTRAINT events_calendar_id_fkey;

ALTER TABLE events 
  ADD CONSTRAINT events_calendar_id_fkey 
  FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_calendar_id_fkey;

-- Calendar module - event attendees
ALTER TABLE event_attendees 
  DROP CONSTRAINT event_attendees_event_id_fkey;

ALTER TABLE event_attendees 
  ADD CONSTRAINT event_attendees_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE event_attendees VALIDATE CONSTRAINT event_attendees_event_id_fkey;

-- ============================================================================
-- Step 5: Add composite foreign keys to prevent cross-workspace references
-- ============================================================================

-- Composite FK for tasks.projectId to ensure project is in same workspace
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_project_id_workspace_fkey 
  FOREIGN KEY (project_id, workspace_id) 
  REFERENCES projects(id, workspace_id) 
  ON DELETE SET NULL NOT VALID;

ALTER TABLE tasks VALIDATE CONSTRAINT tasks_project_id_workspace_fkey;

-- Composite FK for events.calendarId to ensure calendar is in same workspace
ALTER TABLE events 
  ADD CONSTRAINT events_calendar_id_workspace_fkey 
  FOREIGN KEY (calendar_id, workspace_id) 
  REFERENCES calendars(id, workspace_id) 
  ON DELETE CASCADE NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_calendar_id_workspace_fkey;

-- Composite FK for scheduling_links.calendarId to ensure calendar is in same workspace
ALTER TABLE scheduling_links 
  ADD CONSTRAINT scheduling_links_calendar_id_workspace_fkey 
  FOREIGN KEY (calendar_id, workspace_id) 
  REFERENCES calendars(id, workspace_id) 
  ON DELETE CASCADE NOT VALID;

ALTER TABLE scheduling_links VALIDATE CONSTRAINT scheduling_links_calendar_id_workspace_fkey;

-- Composite FK for tasks.calendarEventId to ensure event is in same workspace
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_calendar_event_id_workspace_fkey 
  FOREIGN KEY (calendar_event_id, workspace_id) 
  REFERENCES events(id, workspace_id) 
  ON DELETE SET NULL NOT VALID;

ALTER TABLE tasks VALIDATE CONSTRAINT tasks_calendar_event_id_workspace_fkey;

-- Composite FK for events.taskId to ensure task is in same workspace
ALTER TABLE events 
  ADD CONSTRAINT events_task_id_workspace_fkey 
  FOREIGN KEY (task_id, workspace_id) 
  REFERENCES tasks(id, workspace_id) 
  ON DELETE SET NULL NOT VALID;

ALTER TABLE events VALIDATE CONSTRAINT events_task_id_workspace_fkey;

-- ============================================================================
-- Step 6: Add indexes for composite foreign key performance
-- ============================================================================

-- Index for tasks (project_id, workspace_id) to support composite FK
CREATE INDEX IF NOT EXISTS tasks_project_id_workspace_idx 
  ON tasks(project_id, workspace_id) 
  WHERE project_id IS NOT NULL;

-- Index for events (calendar_id, workspace_id) to support composite FK
CREATE INDEX IF NOT EXISTS events_calendar_id_workspace_idx 
  ON events(calendar_id, workspace_id);

-- Index for scheduling_links (calendar_id, workspace_id) to support composite FK
CREATE INDEX IF NOT EXISTS scheduling_links_calendar_id_workspace_idx 
  ON scheduling_links(calendar_id, workspace_id);

-- Index for tasks (calendar_event_id, workspace_id) to support composite FK
CREATE INDEX IF NOT EXISTS tasks_calendar_event_id_workspace_idx 
  ON tasks(calendar_event_id, workspace_id) 
  WHERE calendar_event_id IS NOT NULL;

-- Index for events (task_id, workspace_id) to support composite FK
CREATE INDEX IF NOT EXISTS events_task_id_workspace_idx 
  ON events(task_id, workspace_id) 
  WHERE task_id IS NOT NULL;
