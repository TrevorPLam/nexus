/**
 * MODULE: Calendar Tables Creation
 *
 * Responsibility:
 * Creates calendar module tables (calendars, events, event_attendees, scheduling_links)
 * with proper constraints, indexes, and triggers for the calendar management system.
 *
 * Boundaries:
 * - Table creation only; no RLS policies or data migration.
 * - Establishes schema foundation for calendar functionality.
 *
 * Critical invariants:
 * - All tables have UUID primary keys with gen_random_uuid() defaults.
 * - Foreign key constraints enforce referential integrity.
 * - workspace_id foreign keys enable workspace isolation.
 * - updated_at triggers maintain timestamp on row updates.
 * - Indexes optimize common query patterns (workspace_id, calendar_id, etc.).
 *
 * Side effects:
 * - Creates new tables, affecting database schema.
 * - Adds triggers for automatic updated_at maintenance.
 *
 * Change risk:
 * - High. Table creation is foundational; changes affect all calendar features.
 *
 * Links:
 * - packages/database/src/schema/calendar.ts (calendar schema definitions)
 * - packages/contracts/src/calendar.ts (calendar domain schemas)
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: schema
 * - stability: stable
 * - concerns: tables, constraints, indexes, triggers
 *
 * File:
 * - supabase/migrations/0007_create_calendar_tables.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Calendar Module Tables
-- This migration creates the calendar module tables with proper constraints and indexes

-- Calendars table
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  provider TEXT, -- 'local', 'google', 'outlook', etc.
  provider_calendar_id TEXT, -- External calendar ID
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  start TIMESTAMP NOT NULL,
  end TIMESTAMP NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recurrence_rule TEXT, -- RRULE format
  recurrence_id UUID, -- For recurring event instances
  provider_event_id TEXT, -- External event ID
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'needs_action', -- 'needs_action', 'accepted', 'declined', 'tentative'
  is_organizer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Scheduling links table
CREATE TABLE IF NOT EXISTS scheduling_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  event_duration INTEGER NOT NULL, -- Duration in minutes
  buffer_before INTEGER DEFAULT 0, -- Buffer time before event in minutes
  buffer_after INTEGER DEFAULT 0, -- Buffer time after event in minutes
  min_booking_notice INTEGER DEFAULT 0, -- Minimum notice in hours
  max_booking_notice INTEGER DEFAULT 0, -- Maximum notice in days (0 = unlimited)
  availability_start TEXT, -- HH:MM format
  availability_end TEXT, -- HH:MM format
  available_days JSONB, -- Array of available days (0-6, Sunday=0)
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  max_daily_bookings INTEGER, -- Max bookings per day
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendars_workspace_id ON calendars(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendars_provider_calendar_id ON calendars(provider_calendar_id) WHERE provider_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start_end ON events(start, end);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_recurrence_id ON events(recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_provider_event_id ON events(provider_event_id) WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(email);

CREATE INDEX IF NOT EXISTS idx_scheduling_links_workspace_id ON scheduling_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_links_user_id ON scheduling_links(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_links_slug ON scheduling_links(slug);
CREATE INDEX IF NOT EXISTS idx_scheduling_links_calendar_id ON scheduling_links(calendar_id);

-- Updated at trigger function (reuse existing or create new)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_links_updated_at BEFORE UPDATE ON scheduling_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
