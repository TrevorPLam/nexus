/**
 * MODULE: RLS Policy Test Harness
 *
 * Responsibility:
 * Provides integration test harness for membership-based RLS policies
 * across Work and Calendar modules to verify policy correctness.
 *
 * Boundaries:
 * - Test script only; no production schema changes.
 * - Creates temporary test data and cleans up after execution.
 *
 * Critical invariants:
 * - Tests verify workspace isolation (users cannot see other workspaces).
 * - Tests verify membership-based access (users see their own workspaces).
 * - Tests cover both Work (projects, tasks) and Calendar (calendars, events) modules.
 * - All test data is cleaned up after test execution.
 *
 * Side effects:
 * - Creates and deletes test data (users, workspaces, projects, tasks, calendars, events).
 * - Uses RAISE NOTICE for test result reporting.
 *
 * Change risk:
 * - Low. Test script only affects test data, not production schema.
 * - Should only be run against clean local Supabase database.
 *
 * Links:
 * - AGENTS.md (Row-Level Security guidelines)
 * - supabase/migrations/0005_add_security_definer_helper_for_rls.sql (membership helper)
 * - supabase/migrations/0009_membership_rls_work_calendar.sql (Calendar policies)
 *
 * Tags:
 * - domain: database
 * - risk: low
 * - layer: testing
 * - stability: stable
 * - concerns: rls, testing, integration-test
 *
 * File:
 * - supabase/migrations/test_rls_policies.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- RLS Policy Integration Test Harness
-- This script tests membership-based RLS policies for Work and Calendar modules
-- Run this against a clean local Supabase database to verify policy correctness

-- Setup: Create test users and workspaces
DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  workspace1_id uuid;
  workspace2_id uuid;
  project1_id uuid;
  task1_id uuid;
  calendar1_id uuid;
  event1_id uuid;
BEGIN
  -- Create test app_users
  INSERT INTO app_users (supabase_user_id, email, full_name)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'user1@test.com', 'User One'),
    ('00000000-0000-0000-0000-000000000002', 'user2@test.com', 'User Two')
  RETURNING id INTO user1_id, user2_id;

  -- Create test workspaces
  INSERT INTO workspaces (owner_id, name)
  VALUES 
    (user1_id, 'Workspace One'),
    (user2_id, 'Workspace Two')
  RETURNING id INTO workspace1_id, workspace2_id;

  -- Create workspace memberships
  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES 
    (workspace1_id, user1_id, 'owner'),
    (workspace2_id, user2_id, 'owner');

  -- Create test data in Workspace 1
  INSERT INTO projects (workspace_id, name)
  VALUES (workspace1_id, 'Project One')
  RETURNING id INTO project1_id;

  INSERT INTO tasks (workspace_id, project_id, title)
  VALUES (workspace1_id, project1_id, 'Task One')
  RETURNING id INTO task1_id;

  INSERT INTO calendars (workspace_id, name)
  VALUES (workspace1_id, 'Calendar One')
  RETURNING id INTO calendar1_id;

  INSERT INTO events (workspace_id, calendar_id, title, start, end)
  VALUES (workspace1_id, calendar1_id, 'Event One', NOW(), NOW() + INTERVAL '1 hour')
  RETURNING id INTO event1_id;

  -- Test 1: User1 should see their own workspace data
  RAISE NOTICE 'Test 1: User1 should see Workspace 1 data';
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  
  IF EXISTS (SELECT 1 FROM projects WHERE id = project1_id) THEN
    RAISE NOTICE 'PASS: User1 can see their own project';
  ELSE
    RAISE NOTICE 'FAIL: User1 cannot see their own project';
  END IF;

  IF EXISTS (SELECT 1 FROM tasks WHERE id = task1_id) THEN
    RAISE NOTICE 'PASS: User1 can see their own task';
  ELSE
    RAISE NOTICE 'FAIL: User1 cannot see their own task';
  END IF;

  IF EXISTS (SELECT 1 FROM calendars WHERE id = calendar1_id) THEN
    RAISE NOTICE 'PASS: User1 can see their own calendar';
  ELSE
    RAISE NOTICE 'FAIL: User1 cannot see their own calendar';
  END IF;

  IF EXISTS (SELECT 1 FROM events WHERE id = event1_id) THEN
    RAISE NOTICE 'PASS: User1 can see their own event';
  ELSE
    RAISE NOTICE 'FAIL: User1 cannot see their own event';
  END IF;

  -- Test 2: User2 should NOT see User1's workspace data
  RAISE NOTICE 'Test 2: User2 should NOT see Workspace 1 data';
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project1_id) THEN
    RAISE NOTICE 'PASS: User2 cannot see User1 project';
  ELSE
    RAISE NOTICE 'FAIL: User2 can see User1 project (RLS violation)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = task1_id) THEN
    RAISE NOTICE 'PASS: User2 cannot see User1 task';
  ELSE
    RAISE NOTICE 'FAIL: User2 can see User1 task (RLS violation)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM calendars WHERE id = calendar1_id) THEN
    RAISE NOTICE 'PASS: User2 cannot see User1 calendar';
  ELSE
    RAISE NOTICE 'FAIL: User2 can see User1 calendar (RLS violation)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM events WHERE id = event1_id) THEN
    RAISE NOTICE 'PASS: User2 cannot see User1 event';
  ELSE
    RAISE NOTICE 'FAIL: User2 can see User1 event (RLS violation)';
  END IF;

  -- Test 3: User2 should see their own workspace data
  RAISE NOTICE 'Test 3: User2 should see Workspace 2 data';
  
  IF EXISTS (SELECT 1 FROM workspaces WHERE id = workspace2_id) THEN
    RAISE NOTICE 'PASS: User2 can see their own workspace';
  ELSE
    RAISE NOTICE 'FAIL: User2 cannot see their own workspace';
  END IF;

  -- Test 4: User1 should NOT see User2's workspace data
  RAISE NOTICE 'Test 4: User1 should NOT see Workspace 2 data';
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = workspace2_id) THEN
    RAISE NOTICE 'PASS: User1 cannot see User2 workspace';
  ELSE
    RAISE NOTICE 'FAIL: User1 can see User2 workspace (RLS violation)';
  END IF;

  -- Cleanup
  DELETE FROM events WHERE id = event1_id;
  DELETE FROM calendars WHERE id = calendar1_id;
  DELETE FROM tasks WHERE id = task1_id;
  DELETE FROM projects WHERE id = project1_id;
  DELETE FROM workspace_memberships WHERE workspace_id IN (workspace1_id, workspace2_id);
  DELETE FROM workspaces WHERE id IN (workspace1_id, workspace2_id);
  DELETE FROM app_users WHERE id IN (user1_id, user2_id);

  RAISE NOTICE 'RLS Policy Tests Completed';
END $$;
