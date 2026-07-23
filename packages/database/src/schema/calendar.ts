/**
 * MODULE: Calendar Database Schema
 *
 * Responsibility:
 * Defines the persistence layer for calendar entities, including calendars,
 * events, attendees, and scheduling links.
 *
 * Boundaries:
 * - Depends on core.ts for user and workspace foundations.
 * - Does not include task entities (see work.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Every calendar, event, and scheduling link must belong to a valid workspaceId for RLS
 *   - Event start times must precede end times (validated at application layer)
 *   - Scheduling link slugs must be globally unique and URL-safe
 *   - Calendar IDs must exist before creating events (foreign key constraint)
 *   - Event IDs must exist before creating attendees (foreign key constraint)
 *   - Calendar IDs must exist before creating scheduling links (foreign key constraint)
 * - Postconditions:
 *   - Workspace deletion cascades to all associated calendars, events, and scheduling links
 *   - Calendar deletion cascades to all associated events and scheduling links
 *   - Event deletion cascades to all associated attendees
 *   - Scheduling link slug uniqueness is enforced by database unique constraint
 *   - All foreign key constraints are enforced at database level
 *   - Test coverage: See packages/database/test/ (no tests found - MISSING COVERAGE)
 *
 * Side effects:
 * - Authoritative source for database migrations via drizzle-kit.
 *
 * Change risk:
 * - High. Structural changes may affect external provider synchronization
 *   and public-facing booking reliability.
 *
 * Links:
 * - packages/contracts/src/calendar.ts (domain schemas)
 * - supabase/migrations/ (RLS policies for calendar tables)
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: rls, scheduling, external-sync
 *
 * File:
 * - packages/database/src/schema/calendar.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import {
  pgTable,
  uuid,
  timestamp,
  text,
  boolean,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';

import { workspaces, appUsers } from './core.js';

/**
 * CALENDARS
 * Collections of events, possibly synced from external providers.
 */
export const calendars = pgTable(
  'calendars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    isDefault: boolean('is_default').notNull().default(false),
    provider: text('provider'), // 'local', 'google', 'outlook', etc.
    providerCalendarId: text('provider_calendar_id'), // External calendar ID
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('calendars_workspace_id_idx').on(table.workspaceId),
    providerCalendarIdIdx: index('calendars_provider_calendar_id_idx').on(table.providerCalendarId),
  }),
);

/**
 * EVENTS & ATTENDEES
 * Specific time-bound entries within a calendar and their participants.
 */
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  calendarId: uuid('calendar_id')
    .notNull()
    .references(() => calendars.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  start: timestamp('start').notNull(),
  end: timestamp('end').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  recurrenceRule: text('recurrence_rule'), // RRULE format
  recurrenceId: uuid('recurrence_id'), // For recurring event instances
  providerEventId: text('provider_event_id'), // External event ID
  taskId: uuid('task_id'), // Link to task - FK added in migration to avoid circular dependency
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const eventAttendees = pgTable('event_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status').notNull().default('needs_action'), // 'needs_action', 'accepted', 'declined', 'tentative'
  isOrganizer: boolean('is_organizer').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * SCHEDULING LINKS
 * Public booking pages that allow external users to book time on a calendar.
 */
export const schedulingLinks = pgTable(
  'scheduling_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // URL slug for public booking page
    description: text('description'),
    calendarId: uuid('calendar_id')
      .notNull()
      .references(() => calendars.id, { onDelete: 'cascade' }),
    eventDuration: integer('event_duration').notNull(), // Duration in minutes
    bufferBefore: integer('buffer_before').default(0), // Buffer time before event in minutes
    bufferAfter: integer('buffer_after').default(0), // Buffer time after event in minutes
    minBookingNotice: integer('min_booking_notice').default(0), // Minimum notice in hours
    maxBookingNotice: integer('max_booking_notice').default(0), // Maximum notice in days (0 = unlimited)
    availabilityStart: text('availability_start'), // HH:MM format
    availabilityEnd: text('availability_end'), // HH:MM format
    availableDays: jsonb('available_days').$type<number[]>(), // Array of available days (0-6, Sunday=0)
    timezone: text('timezone').notNull().default('UTC'), // Timezone for availability windows
    isActive: boolean('is_active').notNull().default(true),
    requiresApproval: boolean('requires_approval').notNull().default(false),
    maxDailyBookings: integer('max_daily_bookings'), // Max bookings per day
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('scheduling_links_workspace_id_idx').on(table.workspaceId),
    userIdIdx: index('scheduling_links_user_id_idx').on(table.userId),
    slugIdx: index('scheduling_links_slug_idx').on(table.slug),
    calendarIdIdx: index('scheduling_links_calendar_id_idx').on(table.calendarId),
  }),
);
