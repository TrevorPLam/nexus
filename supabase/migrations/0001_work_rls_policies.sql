-- Row Level Security Policies for Work Module
-- These policies enforce workspace-level isolation for all Work tables
-- Pattern: workspace_id = current_setting('app.workspace_id')::uuid

-- Enable RLS on all Work tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies FORCE ROW LEVEL SECURITY;

ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes FORCE ROW LEVEL SECURITY;

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees FORCE ROW LEVEL SECURITY;

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries FORCE ROW LEVEL SECURITY;

-- Projects RLS Policies
CREATE POLICY projects_select ON projects
  FOR SELECT
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY projects_insert ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY projects_update ON projects
  FOR UPDATE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY projects_delete ON projects
  FOR DELETE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

-- Tasks RLS Policies
CREATE POLICY tasks_select ON tasks
  FOR SELECT
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY tasks_insert ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY tasks_update ON tasks
  FOR UPDATE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY tasks_delete ON tasks
  FOR DELETE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

-- Task Dependencies RLS Policies (cascade through tasks table)
CREATE POLICY task_dependencies_select ON task_dependencies
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_dependencies_insert ON task_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_dependencies_delete ON task_dependencies
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Notes RLS Policies
CREATE POLICY task_notes_select ON task_notes
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_notes_insert ON task_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_notes_update ON task_notes
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_notes_delete ON task_notes
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Assignees RLS Policies
CREATE POLICY task_assignees_select ON task_assignees
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_assignees_insert ON task_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_assignees_delete ON task_assignees
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Comments RLS Policies
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_comments_update ON task_comments
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_comments_delete ON task_comments
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Task Attachments RLS Policies
CREATE POLICY task_attachments_select ON task_attachments
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_attachments_insert ON task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY task_attachments_delete ON task_attachments
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Time Entries RLS Policies
CREATE POLICY time_entries_select ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY time_entries_insert ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY time_entries_update ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY time_entries_delete ON time_entries
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Create function to set workspace context for transactions
CREATE OR REPLACE FUNCTION set_workspace_context(workspace_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.workspace_id', workspace_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
