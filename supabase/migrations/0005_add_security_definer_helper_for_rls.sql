/**
 * MODULE: RLS Security Definer Helper
 *
 * Responsibility:
 * Adds SECURITY DEFINER helper function for RLS policies to bypass
 * RLS for membership lookup, avoiding infinite recursion and improving performance.
 *
 * Boundaries:
 * - Security helper function creation and RLS policy updates only.
 * - Function bypasses RLS for workspace_memberships table lookup.
 *
 * Critical invariants:
 * - get_user_workspace_ids() runs with SECURITY DEFINER (bypasses RLS).
 * - Function is STABLE (results can be cached).
 * - All Work RLS policies updated to use the helper function.
 * - Prevents infinite recursion in RLS policy evaluation.
 *
 * Side effects:
 * - Creates SECURITY DEFINER function with elevated privileges.
 * - Updates all Work module RLS policies to use the helper.
 *
 * Change risk:
 * - High. SECURITY DEFINER functions require careful privilege management.
 * - Changes all Work RLS policies, affecting data access.
 *
 * Links:
 * - AGENTS.md (Row-Level Security guidelines)
 * - supabase/migrations/0001_work_rls_policies.sql (base RLS policies)
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: security
 * - stability: stable
 * - concerns: rls, security-definer, performance
 *
 * File:
 * - supabase/migrations/0005_add_security_definer_helper_for_rls.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Add SECURITY DEFINER helper function for RLS policies
-- This function bypasses RLS for the membership lookup to avoid infinite recursion
-- and improves performance by caching results

-- Create SECURITY DEFINER function to get user's workspace IDs
CREATE OR REPLACE FUNCTION get_user_workspace_ids(user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_memberships WHERE user_id = $1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_workspace_ids(uuid) TO authenticated;

-- Update RLS policies to use the helper function
-- This improves performance and avoids recursion issues

-- Projects RLS Policies - update to use helper
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated
  WITH CHECK (id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects
  FOR UPDATE TO authenticated
  USING (id IN (SELECT get_user_workspace_ids(auth.uid())))
  WITH CHECK (id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects
  FOR DELETE TO authenticated
  USING (id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Tasks RLS Policies - update to use helper
DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Task Dependencies RLS Policies - update to use helper
DROP POLICY IF EXISTS task_dependencies_select ON task_dependencies;
CREATE POLICY task_dependencies_select ON task_dependencies
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_dependencies_insert ON task_dependencies;
CREATE POLICY task_dependencies_insert ON task_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_dependencies_delete ON task_dependencies;
CREATE POLICY task_dependencies_delete ON task_dependencies
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

-- Task Notes RLS Policies - update to use helper
DROP POLICY IF EXISTS task_notes_select ON task_notes;
CREATE POLICY task_notes_select ON task_notes
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_notes_insert ON task_notes;
CREATE POLICY task_notes_insert ON task_notes
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_notes_update ON task_notes;
CREATE POLICY task_notes_update ON task_notes
  FOR UPDATE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))))
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_notes_delete ON task_notes;
CREATE POLICY task_notes_delete ON task_notes
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

-- Task Assignees RLS Policies - update to use helper
DROP POLICY IF EXISTS task_assignees_select ON task_assignees;
CREATE POLICY task_assignees_select ON task_assignees
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_assignees_insert ON task_assignees;
CREATE POLICY task_assignees_insert ON task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_assignees_delete ON task_assignees;
CREATE POLICY task_assignees_delete ON task_assignees
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

-- Task Comments RLS Policies - update to use helper
DROP POLICY IF EXISTS task_comments_select ON task_comments;
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_comments_insert ON task_comments;
CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_comments_update ON task_comments;
CREATE POLICY task_comments_update ON task_comments
  FOR UPDATE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))))
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_comments_delete ON task_comments;
CREATE POLICY task_comments_delete ON task_comments
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

-- Task Attachments RLS Policies - update to use helper
DROP POLICY IF EXISTS task_attachments_select ON task_attachments;
CREATE POLICY task_attachments_select ON task_attachments
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_attachments_insert ON task_attachments;
CREATE POLICY task_attachments_insert ON task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS task_attachments_delete ON task_attachments;
CREATE POLICY task_attachments_delete ON task_attachments
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

-- Time Entries RLS Policies - update to use helper
DROP POLICY IF EXISTS time_entries_select ON time_entries;
CREATE POLICY time_entries_select ON time_entries
  FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS time_entries_insert ON time_entries;
CREATE POLICY time_entries_insert ON time_entries
  FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS time_entries_update ON time_entries;
CREATE POLICY time_entries_update ON time_entries
  FOR UPDATE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))))
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));

DROP POLICY IF EXISTS time_entries_delete ON time_entries;
CREATE POLICY time_entries_delete ON time_entries
  FOR DELETE TO authenticated
  USING (task_id IN (SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))));
