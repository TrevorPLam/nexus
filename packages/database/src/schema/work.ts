import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  boolean,
  integer,
  index,
  customType,
} from 'drizzle-orm/pg-core';

import { workspaces, appUsers } from './core.js';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    icon: text('icon'),
    status: text('status').notNull().default('active'), // 'active', 'archived', 'deleted'
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('projects_workspace_id_idx').on(table.workspaceId),
    workspaceIdNameIdx: index('projects_workspace_id_name_idx').on(table.workspaceId, table.name),
  }),
);

// Forward declaration for self-referencing
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    parentId: uuid('parent_id'), // For subtasks - FK added in migration to avoid circular dependency
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('todo'), // 'todo', 'in_progress', 'done', 'cancelled'
    priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
    dueDate: timestamp('due_date'),
    dueTime: text('due_time'), // HH:MM format
    estimatedDuration: integer('estimated_duration'), // in minutes
    completedAt: timestamp('completed_at'),
    calendarEventId: uuid('calendar_event_id'), // Link to calendar event - FK added in migration to avoid circular dependency
    recurrenceRule: text('recurrence_rule'), // RRULE format for recurring tasks
    recurrenceId: uuid('recurrence_id'), // For recurring task instances
    energyLevel: text('energy_level'), // 'low', 'medium', 'high'
    contextTags: text('context_tags'), // Comma-separated context tags
    isMilestone: boolean('is_milestone').notNull().default(false), // Milestone flag
    searchVector: tsvector('search_vector'), // For full-text search
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('tasks_workspace_id_idx').on(table.workspaceId),
    workspaceIdProjectIdIdx: index('tasks_workspace_id_project_id_idx').on(
      table.workspaceId,
      table.projectId,
    ),
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    parentIdIdx: index('tasks_parent_id_idx').on(table.parentId),
    statusIdx: index('tasks_status_idx').on(table.status),
    dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
    workspaceIdStatusIdx: index('tasks_workspace_id_status_idx').on(
      table.workspaceId,
      table.status,
    ),
  }),
);

export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  dependsOnTaskId: uuid('depends_on_task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('finish_to_start'), // 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const taskNotes = pgTable('task_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskAssignees = pgTable(
  'task_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => appUsers.id),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (table) => ({
    taskIdIdx: index('task_assignees_task_id_idx').on(table.taskId),
    userIdIdx: index('task_assignees_user_id_idx').on(table.userId),
    taskUserUnique: index('task_assignees_task_user_unique').on(table.taskId, table.userId),
  }),
);

export const taskComments = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => appUsers.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: uuid('parent_id'), // For threaded replies - FK added in migration to avoid circular dependency
  mentions: jsonb('mentions').$type<string[]>(), // Array of mentioned user IDs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taskAttachments = pgTable(
  'task_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(), // MIME type
    fileSize: text('file_size').notNull(), // Size in bytes as string
    storagePath: text('storage_path').notNull(), // Supabase Storage path
    storageBucket: text('storage_bucket').notNull().default('attachments'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    taskIdIdx: index('task_attachments_task_id_idx').on(table.taskId),
    uploadedByIdx: index('task_attachments_uploaded_by_idx').on(table.uploadedBy),
  }),
);

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    description: text('description'),
    startedAt: timestamp('started_at').notNull(),
    stoppedAt: timestamp('stopped_at'),
    duration: text('duration'), // Duration in minutes as string
    isBillable: boolean('is_billable').notNull().default(false),
    billableRate: text('billable_rate'), // Rate as string (decimal)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    taskIdIdx: index('time_entries_task_id_idx').on(table.taskId),
    userIdIdx: index('time_entries_user_id_idx').on(table.userId),
    startedAtIdx: index('time_entries_started_at_idx').on(table.startedAt),
  }),
);
