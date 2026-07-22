import { pgTable, uuid, timestamp, text, boolean, jsonb } from 'drizzle-orm/pg-core';

import { workspaces } from './core.js';

export const calendars = pgTable('calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  isDefault: boolean('is_default').notNull().default(false),
  provider: text('provider'), // 'local', 'google', 'outlook', etc.
  providerCalendarId: text('provider_calendar_id'), // External calendar ID
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  calendarId: uuid('calendar_id')
    .notNull()
    .references(() => calendars.id),
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
  taskId: uuid('task_id'), // Link to task
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const eventAttendees = pgTable('event_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status').notNull().default('needs_action'), // 'needs_action', 'accepted', 'declined', 'tentative'
  isOrganizer: boolean('is_organizer').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
