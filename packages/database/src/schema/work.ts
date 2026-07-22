import { pgTable, uuid, timestamp, text, jsonb, boolean } from 'drizzle-orm/pg-core';

import { workspaces, appUsers } from './core.js';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  icon: text('icon'),
  status: text('status').notNull().default('active'), // 'active', 'archived', 'deleted'
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  projectId: uuid('project_id').references(() => projects.id),
  parentId: uuid('parent_id'), // For subtasks - constraint added separately
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'), // 'todo', 'in_progress', 'done', 'cancelled'
  priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
  dueDate: timestamp('due_date'),
  dueTime: text('due_time'), // HH:MM format
  estimatedDuration: text('estimated_duration'), // in minutes
  completedAt: timestamp('completed_at'),
  calendarEventId: uuid('calendar_event_id'), // Link to calendar event
  recurrenceRule: text('recurrence_rule'), // RRULE format for recurring tasks
  recurrenceId: uuid('recurrence_id'), // For recurring task instances
  energyLevel: text('energy_level'), // 'low', 'medium', 'high'
  contextTags: text('context_tags'), // Comma-separated context tags
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  dependsOnTaskId: uuid('depends_on_task_id')
    .notNull()
    .references(() => tasks.id),
  type: text('type').notNull().default('finish_to_start'), // 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const taskNotes = pgTable('task_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskAssignees = pgTable('task_assignees', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => appUsers.id),
  assignedBy: uuid('assigned_by')
    .notNull()
    .references(() => appUsers.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  isPrimary: boolean('is_primary').notNull().default(false),
});

export const taskComments = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => appUsers.id),
  content: text('content').notNull(),
  parentId: uuid('parent_id'), // For threaded replies - constraint added separately
  mentions: jsonb('mentions').$type<string[]>(), // Array of mentioned user IDs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskAttachments = pgTable('task_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => appUsers.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // MIME type
  fileSize: text('file_size').notNull(), // Size in bytes as string
  storagePath: text('storage_path').notNull(), // Supabase Storage path
  storageBucket: text('storage_bucket').notNull().default('attachments'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => appUsers.id),
  description: text('description'),
  startedAt: timestamp('started_at').notNull(),
  stoppedAt: timestamp('stopped_at'),
  duration: text('duration'), // Duration in minutes as string
  isBillable: boolean('is_billable').notNull().default(false),
  billableRate: text('billable_rate'), // Rate as string (decimal)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
