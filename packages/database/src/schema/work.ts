import { pgTable, uuid, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

import { workspaces } from './core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
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
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  projectId: uuid('project_id').references(() => projects.id),
  parentId: uuid('parent_id').references(() => tasks.id), // For subtasks
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
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  dependsOnTaskId: uuid('depends_on_task_id').notNull().references(() => tasks.id),
  type: text('type').notNull().default('finish_to_start'), // 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const taskNotes = pgTable('task_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
