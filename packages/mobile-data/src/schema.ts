/**
 * MODULE: Mobile PowerSync Schema
 *
 * Responsibility:
 * Defines the client-side SQLite schema for PowerSync offline synchronization.
 * It mirrors the authoritative PostgreSQL schema defined in packages/database.
 *
 * Boundaries:
 * - Specific to the mobile application's local SQLite database.
 * - Does not handle synchronization logic (handled by PowerSync Cloud).
 * - Purely declarative schema definition; no runtime database operations.
 *
 * Critical invariants:
 * - Must strictly match the PostgreSQL schema columns and types for successful replication.
 * - All tables must have an 'id' column as the primary key (automatically handled by PowerSync).
 * - Enum-like fields (status, priority) MUST match backend Zod schema constraints.
 *
 * Side effects:
 * - Defines the physical structure of the local SQLite database on mobile devices.
 *
 * Change risk:
 * - High. Schema mismatches between mobile and server will cause sync failures.
 *
 * Links:
 * - packages/database/src/schema/
 * - apps/mobile/src/lib/powersync/database.ts
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: offline-sync, powersync, sqlite, mobile
 *
 * File:
 * - packages/mobile-data/src/schema.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { column, Schema, Table } from '@powersync/react-native';

// PowerSync schema for mobile offline sync
// Manual schema definition matching PostgreSQL schema from @life-os/database
// This is a temporary approach until drizzle-driver integration is stable

const app_users = new Table({
  supabase_user_id: column.text,
  email: column.text,
  full_name: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const workspaces = new Table({
  name: column.text,
  owner_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const workspace_memberships = new Table({
  workspace_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
});

const projects = new Table({
  workspace_id: column.text,
  name: column.text,
  description: column.text,
  color: column.text,
  icon: column.text,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const tasks = new Table({
  workspace_id: column.text,
  project_id: column.text,
  parent_id: column.text,
  title: column.text,
  description: column.text,
  status: column.text,
  priority: column.text,
  due_date: column.text,
  due_time: column.text,
  estimated_duration: column.integer,
  completed_at: column.text,
  calendar_event_id: column.text,
  recurrence_rule: column.text,
  recurrence_id: column.text,
  energy_level: column.text,
  context_tags: column.text,
  is_milestone: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const task_dependencies = new Table({
  task_id: column.text,
  depends_on_task_id: column.text,
  type: column.text,
  created_at: column.text,
});

const task_notes = new Table({
  task_id: column.text,
  content: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const task_assignees = new Table({
  task_id: column.text,
  user_id: column.text,
  assigned_by: column.text,
  assigned_at: column.text,
  is_primary: column.integer,
});

const task_comments = new Table({
  task_id: column.text,
  user_id: column.text,
  content: column.text,
  parent_id: column.text,
  mentions: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const task_attachments = new Table({
  task_id: column.text,
  uploaded_by: column.text,
  fileName: column.text,
  fileType: column.text,
  fileSize: column.text,
  storage_path: column.text,
  storage_bucket: column.text,
  metadata: column.text,
  created_at: column.text,
});

const time_entries = new Table({
  task_id: column.text,
  user_id: column.text,
  description: column.text,
  started_at: column.text,
  stopped_at: column.text,
  duration: column.text,
  is_billable: column.integer,
  billable_rate: column.text,
  metadata: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const calendars = new Table({
  workspace_id: column.text,
  name: column.text,
  description: column.text,
  color: column.text,
  is_default: column.integer,
  provider: column.text,
  provider_calendar_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const events = new Table({
  workspace_id: column.text,
  calendar_id: column.text,
  title: column.text,
  description: column.text,
  location: column.text,
  is_all_day: column.integer,
  start: column.text,
  end: column.text,
  timezone: column.text,
  recurrence_rule: column.text,
  recurrence_id: column.text,
  provider_event_id: column.text,
  task_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const event_attendees = new Table({
  event_id: column.text,
  email: column.text,
  name: column.text,
  status: column.text,
  is_organizer: column.integer,
  created_at: column.text,
});

const scheduling_links = new Table({
  workspace_id: column.text,
  user_id: column.text,
  name: column.text,
  slug: column.text,
  description: column.text,
  calendar_id: column.text,
  event_duration: column.integer,
  buffer_before: column.integer,
  buffer_after: column.integer,
  min_booking_notice: column.integer,
  max_booking_notice: column.integer,
  availability_start: column.text,
  availability_end: column.text,
  available_days: column.text,
  timezone: column.text,
  is_active: column.integer,
  requires_approval: column.integer,
  max_daily_bookings: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

export const powersyncSchema = new Schema({
  app_users,
  workspaces,
  workspace_memberships,
  projects,
  tasks,
  task_dependencies,
  task_notes,
  task_assignees,
  task_comments,
  task_attachments,
  time_entries,
  calendars,
  events,
  event_attendees,
  scheduling_links,
});

// Export types for use in the app
export type Database = (typeof powersyncSchema)['types'];
export type ProjectRecord = Database['projects'];
export type TaskRecord = Database['tasks'];
export type CalendarRecord = Database['calendars'];

export default powersyncSchema;
