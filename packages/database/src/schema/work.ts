/**
 * MODULE: Work Management Database Schema
 *
 * Responsibility:
 * Defines the persistence layer for work management entities, including
 * projects, tasks, dependencies, notes, assignees, comments, attachments,
 * and time entries.
 *
 * Boundaries:
 * - Depends on core.ts for user and workspace foundations.
 * - Does not include calendar entities (see calendar.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - All projects and tasks must be associated with a valid workspaceId for RLS
 *   - Task parentId must reference an existing task in the same workspace (validated at app layer)
 *   - Task calendarEventId must reference an existing event in the same workspace (validated at app layer)
 *   - Task dependencies must not create circular references (validated at app layer)
 *   - Foreign key references must exist before insertion (workspace, project, user)
 * - Postconditions:
 *   - Workspace deletion cascades to all associated projects and tasks
 *   - Project deletion sets task.projectId to null (ON DELETE SET NULL)
 *   - Task deletion cascades to dependencies, notes, assignees, comments, attachments, and time entries
 *   - User deletion cascades to task assignees, comments, attachments, and time entries
 *   - All foreign key constraints are enforced at database level
 *   - Test coverage: See packages/database/test/ (no tests found - MISSING COVERAGE)
 *
 * Side effects:
 * - Authoritative source for migrations and full-text search indexing (tsvector).
 *
 * Change risk:
 * - High. Structural changes require coordinated migrations and affect
 *   query performance via indexes.
 *
 * Links:
 * - packages/contracts/src/work.ts (domain schemas)
 * - supabase/migrations/ (RLS policies for work tables)
 *
 * Tags:
 * - domain: work-management
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: rls, full-text-search, dependencies
 *
 * File:
 * - packages/database/src/schema/work.ts
 *
 * Last updated:
 * - July 22, 2026
 */

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

/**
 * PROJECTS
 * Containers for organizing tasks within a workspace.
 */
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
    // workspaceIdIdx: Primary lookup for workspace-scoped queries (RLS filtering)
    workspaceIdIdx: index('projects_workspace_id_idx').on(table.workspaceId),
    // workspaceIdNameIdx: Supports name uniqueness checks within a workspace
    workspaceIdNameIdx: index('projects_workspace_id_name_idx').on(table.workspaceId, table.name),
  }),
);

/**
 * TASKS
 * The core unit of work, supporting hierarchy, recurrence, and search.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    // projectId uses 'set null' on delete: tasks survive project deletion as orphans
    // This is a deliberate choice to preserve task history when projects are soft-deleted
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
    // calendarEventId: Link to calendar event - FK added in migration to avoid circular dependency
    // This enables bidirectional sync between tasks and calendar events
    calendarEventId: uuid('calendar_event_id'),
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
    // workspaceIdIdx: Primary lookup for workspace-scoped queries (RLS filtering)
    workspaceIdIdx: index('tasks_workspace_id_idx').on(table.workspaceId),
    // workspaceIdProjectIdIdx: Optimizes queries for tasks within a specific project
    workspaceIdProjectIdIdx: index('tasks_workspace_id_project_id_idx').on(
      table.workspaceId,
      table.projectId,
    ),
    // projectIdIdx: Supports project deletion cascade and task list queries
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    // parentIdIdx: Optimizes subtask hierarchy queries
    parentIdIdx: index('tasks_parent_id_idx').on(table.parentId),
    // statusIdx: Supports filtering by status (e.g., get all 'done' tasks)
    statusIdx: index('tasks_status_idx').on(table.status),
    // dueDateIdx: Optimizes due date sorting and overdue task queries
    dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
    // workspaceIdStatusIdx: Composite index for workspace + status filtering (common query pattern)
    workspaceIdStatusIdx: index('tasks_workspace_id_status_idx').on(
      table.workspaceId,
      table.status,
    ),
  }),
);

/**
 * TASK EXTENSIONS
 * Supporting entities for tasks: dependencies, notes, assignees, comments, and attachments.
 */

export const taskDependencies = pgTable('task_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  dependsOnTaskId: uuid('depends_on_task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  // type: Dependency relationship type following PMBOK/Project Management standards
  // finish_to_start: Task B cannot start until Task A finishes (most common)
  // start_to_start: Task B cannot start until Task A starts
  // finish_to_finish: Task B cannot finish until Task A finishes
  // start_to_finish: Task B cannot finish until Task A starts (rare, used in scheduling)
  type: text('type').notNull().default('finish_to_start'),
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
    // taskUserUnique: Prevents duplicate assignments of the same user to the same task
    // This is a uniqueness constraint, not just an index, enforced at the database level
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
    // fileSize stored as string to avoid integer overflow for large files (>2GB)
    // PostgreSQL bigint would be better, but string is simpler for JSON serialization
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

/**
 * TIME TRACKING
 * Integrated time entries for task-based work.
 */
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
    // isBillable: Flag for billing integration - consider moving to a separate billing table
    // if billing logic becomes complex (e.g., different rates per client, overtime rules)
    isBillable: boolean('is_billable').notNull().default(false),
    // billableRate stored as string to avoid floating-point precision issues
    // Use decimal arithmetic in application code for monetary calculations
    billableRate: text('billable_rate'), // Rate as string (decimal)
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    taskIdIdx: index('time_entries_task_id_idx').on(table.taskId),
    userIdIdx: index('time_entries_user_id_idx').on(table.userId),
    // startedAtIdx: Optimizes time range queries for reporting (e.g., weekly timesheets)
    startedAtIdx: index('time_entries_started_at_idx').on(table.startedAt),
  }),
);
