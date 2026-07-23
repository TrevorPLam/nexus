-- Enable RLS on missing work-related tables
ALTER TABLE "task_assignees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;

-- Task Assignees RLS Policies
-- Users can read task assignees for tasks in their workspaces
CREATE POLICY "task_assignees_read_workspace_member" ON "task_assignees"
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can insert task assignees for tasks in their workspaces
CREATE POLICY "task_assignees_insert_workspace_member" ON "task_assignees"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    AND user_id IN (
      SELECT id FROM app_users WHERE supabase_user_id = auth.uid()
    )
  );

-- Users can update task assignees for tasks in their workspaces
CREATE POLICY "task_assignees_update_workspace_member" ON "task_assignees"
  FOR UPDATE
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can delete task assignees for tasks in their workspaces
CREATE POLICY "task_assignees_delete_workspace_member" ON "task_assignees"
  FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Task Comments RLS Policies
-- Users can read task comments for tasks in their workspaces
CREATE POLICY "task_comments_read_workspace_member" ON "task_comments"
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can insert task comments for tasks in their workspaces
CREATE POLICY "task_comments_insert_workspace_member" ON "task_comments"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    AND user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can update their own task comments
CREATE POLICY "task_comments_update_author" ON "task_comments"
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can delete their own task comments
CREATE POLICY "task_comments_delete_author" ON "task_comments"
  FOR DELETE
  USING (
    user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Task Attachments RLS Policies
-- Users can read task attachments for tasks in their workspaces
CREATE POLICY "task_attachments_read_workspace_member" ON "task_attachments"
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can insert task attachments for tasks in their workspaces
CREATE POLICY "task_attachments_insert_workspace_member" ON "task_attachments"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    AND uploaded_by = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can delete their own task attachments
CREATE POLICY "task_attachments_delete_author" ON "task_attachments"
  FOR DELETE
  USING (
    uploaded_by = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Time Entries RLS Policies
-- Users can read time entries for tasks in their workspaces or their own entries
CREATE POLICY "time_entries_read_workspace_member_or_own" ON "time_entries"
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    OR user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can insert time entries for tasks in their workspaces
CREATE POLICY "time_entries_insert_workspace_member" ON "time_entries"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    AND user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can update their own time entries
CREATE POLICY "time_entries_update_author" ON "time_entries"
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );

-- Users can delete their own time entries
CREATE POLICY "time_entries_delete_author" ON "time_entries"
  FOR DELETE
  USING (
    user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
  );
