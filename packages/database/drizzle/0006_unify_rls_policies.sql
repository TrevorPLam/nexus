-- Unify RLS policies to use consistent workspace context approach
-- This migration ensures all work tables use the app.workspace_id setting
-- for consistent and efficient RLS enforcement

-- Drop inconsistent policies from 0004_missing_work_rls_policies.sql
DROP POLICY IF EXISTS "task_assignees_select_policy" ON "task_assignees";
DROP POLICY IF EXISTS "task_assignees_insert_policy" ON "task_assignees";
DROP POLICY IF EXISTS "task_assignees_update_policy" ON "task_assignees";
DROP POLICY IF EXISTS "task_assignees_delete_policy" ON "task_assignees";

DROP POLICY IF EXISTS "task_comments_select_policy" ON "task_comments";
DROP POLICY IF EXISTS "task_comments_insert_policy" ON "task_comments";
DROP POLICY IF EXISTS "task_comments_update_policy" ON "task_comments";
DROP POLICY IF EXISTS "task_comments_delete_policy" ON "task_comments";

DROP POLICY IF EXISTS "task_attachments_select_policy" ON "task_attachments";
DROP POLICY IF EXISTS "task_attachments_insert_policy" ON "task_attachments";
DROP POLICY IF EXISTS "task_attachments_update_policy" ON "task_attachments";
DROP POLICY IF EXISTS "task_attachments_delete_policy" ON "task_attachments";

DROP POLICY IF EXISTS "time_entries_select_policy" ON "time_entries";
DROP POLICY IF EXISTS "time_entries_insert_policy" ON "time_entries";
DROP POLICY IF EXISTS "time_entries_update_policy" ON "time_entries";
DROP POLICY IF EXISTS "time_entries_delete_policy" ON "time_entries";

-- Create unified policies using app.workspace_id setting
-- These policies are consistent with the approach in 0001_work_rls_policies.sql

-- Task Assignees
CREATE POLICY "task_assignees_workspace_select_policy" ON "task_assignees"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_assignees_workspace_insert_policy" ON "task_assignees"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_assignees_workspace_update_policy" ON "task_assignees"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_assignees_workspace_delete_policy" ON "task_assignees"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Comments
CREATE POLICY "task_comments_workspace_select_policy" ON "task_comments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_comments_workspace_insert_policy" ON "task_comments"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_comments_workspace_update_policy" ON "task_comments"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_comments_workspace_delete_policy" ON "task_comments"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Attachments
CREATE POLICY "task_attachments_workspace_select_policy" ON "task_attachments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_attachments_workspace_insert_policy" ON "task_attachments"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_attachments_workspace_update_policy" ON "task_attachments"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "task_attachments_workspace_delete_policy" ON "task_attachments"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Time Entries
CREATE POLICY "time_entries_workspace_select_policy" ON "time_entries"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = time_entries.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "time_entries_workspace_insert_policy" ON "time_entries"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = time_entries.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "time_entries_workspace_update_policy" ON "time_entries"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = time_entries.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY "time_entries_workspace_delete_policy" ON "time_entries"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = time_entries.task_id
      AND tasks.workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );
