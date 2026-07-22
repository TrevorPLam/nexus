import { pgTable, uuid, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

export const appUsers = pgTable('app_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseUserId: uuid('supabase_user_id').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => appUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workspaceMemberships = pgTable('workspace_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => appUsers.id),
  role: text('role').notNull(), // 'owner', 'admin', 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Outbox table for transactional event handoff
export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(), // e.g., 'task.created', 'project.updated'
  aggregateType: text('aggregate_type').notNull(), // e.g., 'task', 'project', 'event'
  aggregateId: uuid('aggregate_id').notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit log for tracking all changes
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => appUsers.id),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  action: text('action').notNull(), // 'create', 'update', 'delete'
  entityType: text('entity_type').notNull(), // 'task', 'project', 'event', etc.
  entityId: uuid('entity_id').notNull(),
  changes: jsonb('changes').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Idempotency keys for safe retry of mutations
export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  userId: uuid('user_id').references(() => appUsers.id),
  endpoint: text('endpoint').notNull(),
  responseStatus: text('response_status').notNull(),
  responseBody: jsonb('response_body').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});
