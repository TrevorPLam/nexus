-- Enable RLS on all workspace-scoped tables
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendars" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
-- Users can read projects in workspaces they are members of
CREATE POLICY "projects_read_workspace_member" ON "projects"
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can insert projects in workspaces they are members of
CREATE POLICY "projects_insert_workspace_member" ON "projects"
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can update projects in workspaces they are members of
CREATE POLICY "projects_update_workspace_member" ON "projects"
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can delete projects in workspaces they are members of
CREATE POLICY "projects_delete_workspace_member" ON "projects"
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Tasks RLS Policies
-- Users can read tasks in workspaces they are members of
CREATE POLICY "tasks_read_workspace_member" ON "tasks"
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can insert tasks in workspaces they are members of
CREATE POLICY "tasks_insert_workspace_member" ON "tasks"
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can update tasks in workspaces they are members of
CREATE POLICY "tasks_update_workspace_member" ON "tasks"
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can delete tasks in workspaces they are members of
CREATE POLICY "tasks_delete_workspace_member" ON "tasks"
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Task Dependencies RLS Policies
-- Users can read task dependencies for tasks in their workspaces
CREATE POLICY "task_dependencies_read_workspace_member" ON "task_dependencies"
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

-- Users can insert task dependencies for tasks in their workspaces
CREATE POLICY "task_dependencies_insert_workspace_member" ON "task_dependencies"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
    AND depends_on_task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can delete task dependencies for tasks in their workspaces
CREATE POLICY "task_dependencies_delete_workspace_member" ON "task_dependencies"
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

-- Task Notes RLS Policies
-- Users can read task notes for tasks in their workspaces
CREATE POLICY "task_notes_read_workspace_member" ON "task_notes"
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

-- Users can insert task notes for tasks in their workspaces
CREATE POLICY "task_notes_insert_workspace_member" ON "task_notes"
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can update task notes for tasks in their workspaces
CREATE POLICY "task_notes_update_workspace_member" ON "task_notes"
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

-- Users can delete task notes for tasks in their workspaces
CREATE POLICY "task_notes_delete_workspace_member" ON "task_notes"
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

-- Calendars RLS Policies
-- Users can read calendars in workspaces they are members of
CREATE POLICY "calendars_read_workspace_member" ON "calendars"
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can insert calendars in workspaces they are members of
CREATE POLICY "calendars_insert_workspace_member" ON "calendars"
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can update calendars in workspaces they are members of
CREATE POLICY "calendars_update_workspace_member" ON "calendars"
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can delete calendars in workspaces they are members of
CREATE POLICY "calendars_delete_workspace_member" ON "calendars"
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Events RLS Policies
-- Users can read events in workspaces they are members of
CREATE POLICY "events_read_workspace_member" ON "events"
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can insert events in workspaces they are members of
CREATE POLICY "events_insert_workspace_member" ON "events"
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can update events in workspaces they are members of
CREATE POLICY "events_update_workspace_member" ON "events"
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Users can delete events in workspaces they are members of
CREATE POLICY "events_delete_workspace_member" ON "events"
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Event Attendees RLS Policies
-- Users can read event attendees for events in their workspaces
CREATE POLICY "event_attendees_read_workspace_member" ON "event_attendees"
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can insert event attendees for events in their workspaces
CREATE POLICY "event_attendees_insert_workspace_member" ON "event_attendees"
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can update event attendees for events in their workspaces
CREATE POLICY "event_attendees_update_workspace_member" ON "event_attendees"
  FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Users can delete event attendees for events in their workspaces
CREATE POLICY "event_attendees_delete_workspace_member" ON "event_attendees"
  FOR DELETE
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_memberships
        WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
      )
    )
  );

-- Audit Logs RLS Policies
-- Users can read audit logs for their own actions or in their workspaces
CREATE POLICY "audit_logs_read_user_or_workspace" ON "audit_logs"
  FOR SELECT
  USING (
    user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = (SELECT id FROM app_users WHERE supabase_user_id = auth.uid())
    )
  );

-- Only service roles can insert audit logs (done via backend)
CREATE POLICY "audit_logs_insert_service_only" ON "audit_logs"
  FOR INSERT
  WITH CHECK (false);

-- Only service roles can delete audit logs
CREATE POLICY "audit_logs_delete_service_only" ON "audit_logs"
  FOR DELETE
  USING (false);

-- Outbox Events RLS Policies
-- Only service roles can read outbox events (for worker processing)
CREATE POLICY "outbox_events_read_service_only" ON "outbox_events"
  FOR SELECT
  USING (false);

-- Only service roles can insert outbox events (done via backend)
CREATE POLICY "outbox_events_insert_service_only" ON "outbox_events"
  FOR INSERT
  WITH CHECK (false);

-- Only service roles can update outbox events (for worker processing)
CREATE POLICY "outbox_events_update_service_only" ON "outbox_events"
  FOR UPDATE
  USING (false);

-- Only service roles can delete outbox events
CREATE POLICY "outbox_events_delete_service_only" ON "outbox_events"
  FOR DELETE
  USING (false);
