/**
 * MODULE: Calendar Membership-Based RLS
 *
 * Responsibility:
 * Updates Calendar RLS policies to use membership-based resolution via
 * get_user_workspace_ids() helper function, replacing current_setting pattern.
 *
 * Boundaries:
 * - RLS policy updates only; no table or function creation.
 * - Aligns Calendar policies with Work module membership-based approach.
 *
 * Critical invariants:
 * - get_app_user_id() maps auth.uid() to app_users.id for identity resolution.
 * - All Calendar RLS policies use get_user_workspace_ids(auth.uid()).
 * - Scheduling links identity mapping fixed to use app_users.id (not supabase_user_id).
 * - Prevents infinite recursion via SECURITY DEFINER helper functions.
 *
 * Side effects:
 * - Updates all Calendar RLS policies, affecting data access patterns.
 * - Changes identity mapping for scheduling links from direct to indirect.
 *
 * Change risk:
 * - High. RLS policy changes affect data access across calendar features.
 * - Identity mapping changes can break scheduling link access.
 *
 * Links:
 * - AGENTS.md (Row-Level Security guidelines)
 * - supabase/migrations/0005_add_security_definer_helper_for_rls.sql (helper function)
 * - supabase/migrations/0008_calendar_rls_policies.sql (base Calendar RLS)
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: security
 * - stability: stable
 * - concerns: rls, membership, identity-mapping
 *
 * File:
 * - supabase/migrations/0009_membership_rls_work_calendar.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Update Calendar RLS Policies to use membership-based resolution
-- This replaces the current_setting('app.workspace_id') pattern with get_user_workspace_ids(auth.uid())
-- which properly resolves access from authenticated identity and workspace membership

-- Helper function to map auth.uid() (supabase_user_id) to app_users.id
CREATE OR REPLACE FUNCTION get_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM app_users WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_app_user_id() TO authenticated;

-- Calendars RLS Policies - update to use membership-based helper
DROP POLICY IF EXISTS calendars_select ON calendars;
CREATE POLICY calendars_select ON calendars
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS calendars_insert ON calendars;
CREATE POLICY calendars_insert ON calendars
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS calendars_update ON calendars;
CREATE POLICY calendars_update ON calendars
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS calendars_delete ON calendars;
CREATE POLICY calendars_delete ON calendars
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Events RLS Policies - update to use membership-based helper
DROP POLICY IF EXISTS events_select ON events;
CREATE POLICY events_select ON events
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS events_insert ON events;
CREATE POLICY events_insert ON events
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS events_delete ON events;
CREATE POLICY events_delete ON events
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Event Attendees RLS Policies - update to use membership-based helper
DROP POLICY IF EXISTS event_attendees_select ON event_attendees;
CREATE POLICY event_attendees_select ON event_attendees
  FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS event_attendees_insert ON event_attendees;
CREATE POLICY event_attendees_insert ON event_attendees
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS event_attendees_update ON event_attendees;
CREATE POLICY event_attendees_update ON event_attendees
  FOR UPDATE TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS event_attendees_delete ON event_attendees;
CREATE POLICY event_attendees_delete ON event_attendees
  FOR DELETE TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

-- Scheduling Links RLS Policies - update to use membership-based helper
DROP POLICY IF EXISTS scheduling_links_select ON scheduling_links;
CREATE POLICY scheduling_links_select ON scheduling_links
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS scheduling_links_insert ON scheduling_links;
CREATE POLICY scheduling_links_insert ON scheduling_links
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS scheduling_links_update ON scheduling_links;
CREATE POLICY scheduling_links_update ON scheduling_links
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS scheduling_links_delete ON scheduling_links;
CREATE POLICY scheduling_links_delete ON scheduling_links
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Fix scheduling_links identity mapping policies
-- These were incorrectly using user_id = auth.uid() but user_id references app_users.id
-- not supabase_user_id. We need to map through app_users table.
DROP POLICY IF EXISTS scheduling_links_select_own ON scheduling_links;
CREATE POLICY scheduling_links_select_own ON scheduling_links
  FOR SELECT TO authenticated
  USING (user_id = get_app_user_id());

DROP POLICY IF EXISTS scheduling_links_update_own ON scheduling_links;
CREATE POLICY scheduling_links_update_own ON scheduling_links
  FOR UPDATE TO authenticated
  USING (user_id = get_app_user_id())
  WITH CHECK (user_id = get_app_user_id());

DROP POLICY IF EXISTS scheduling_links_delete_own ON scheduling_links;
CREATE POLICY scheduling_links_delete_own ON scheduling_links
  FOR DELETE TO authenticated
  USING (user_id = get_app_user_id());
