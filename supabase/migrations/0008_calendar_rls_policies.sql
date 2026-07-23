/**
 * MODULE: Calendar RLS Policies
 *
 * Responsibility:
 * Establishes Row Level Security (RLS) policies for all Calendar module tables
 * to enforce workspace-level data isolation and prevent cross-workspace access.
 *
 * Boundaries:
 * - RLS policy definitions only; no table creation or data migration.
 * - Policies rely on workspace_id or cascade through parent tables.
 *
 * Critical invariants:
 * - All Calendar tables have RLS enabled and forced.
 * - Default-deny: no access unless explicitly permitted by policy.
 * - Workspace isolation enforced via workspace_id or parent table cascade.
 * - Event attendees cascade through events table for workspace isolation.
 * - Scheduling links have additional user-scoped policies for owner access.
 *
 * Side effects:
 * - Enables RLS on all Calendar tables, affecting all database queries.
 * - Alters database security model from open to closed (default-deny).
 *
 * Change risk:
 * - Extreme. RLS changes affect data access across the entire application.
 * - Incorrect policies can cause data leaks or complete access denial.
 *
 * Links:
 * - AGENTS.md (Row-Level Security guidelines)
 * - supabase/migrations/0007_create_calendar_tables.sql (calendar tables)
 *
 * Tags:
 * - domain: database
 * - risk: extreme
 * - layer: security
 * - stability: stable
 * - concerns: rls, security, workspace-isolation
 *
 * File:
 * - supabase/migrations/0008_calendar_rls_policies.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Row Level Security Policies for Calendar Module
-- These policies enforce workspace-level isolation for all Calendar tables
-- Pattern: workspace_id = current_setting('app.workspace_id')::uuid

-- Enable RLS on all Calendar tables
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars FORCE ROW LEVEL SECURITY;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees FORCE ROW LEVEL SECURITY;

ALTER TABLE scheduling_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_links FORCE ROW LEVEL SECURITY;

-- Calendars RLS Policies
CREATE POLICY calendars_select ON calendars
  FOR SELECT
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY calendars_insert ON calendars
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY calendars_update ON calendars
  FOR UPDATE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY calendars_delete ON calendars
  FOR DELETE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

-- Events RLS Policies
CREATE POLICY events_select ON events
  FOR SELECT
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY events_insert ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY events_update ON events
  FOR UPDATE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY events_delete ON events
  FOR DELETE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

-- Event Attendees RLS Policies (cascade through events table)
CREATE POLICY event_attendees_select ON event_attendees
  FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY event_attendees_insert ON event_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY event_attendees_update ON event_attendees
  FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

CREATE POLICY event_attendees_delete ON event_attendees
  FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );

-- Scheduling Links RLS Policies
CREATE POLICY scheduling_links_select ON scheduling_links
  FOR SELECT
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY scheduling_links_insert ON scheduling_links
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY scheduling_links_update ON scheduling_links
  FOR UPDATE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid);

CREATE POLICY scheduling_links_delete ON scheduling_links
  FOR DELETE
  TO authenticated
  USING (workspace_id = current_setting('app.workspace_id', true)::uuid);

-- Additional policy for users to view their own scheduling links
CREATE POLICY scheduling_links_select_own ON scheduling_links
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY scheduling_links_update_own ON scheduling_links
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY scheduling_links_delete_own ON scheduling_links
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
