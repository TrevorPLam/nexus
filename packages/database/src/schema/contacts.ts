/**
 * MODULE: Contacts Database Schema
 *
 * Responsibility:
 * Defines the persistence layer for contact entities, including contact profiles,
 * tags, and interaction history.
 *
 * Boundaries:
 * - Depends on core.ts for user and workspace foundations.
 * - Does not include task or calendar entities (see work.ts, calendar.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Every contact must belong to a valid workspaceId for RLS
 *   - Email addresses must be unique within a workspace
 * - Postconditions:
 *   - Workspace deletion cascades to all associated contacts
 *   - Email uniqueness is enforced by database unique constraint
 *   - All foreign key constraints are enforced at database level
 *   - Test coverage: See packages/database/test/ (no tests found - MISSING COVERAGE)
 *
 * Side effects:
 * - Authoritative source for database migrations via drizzle-kit.
 *
 * Change risk:
 * - High. Structural changes may affect contact management and relationship tracking.
 *
 * Links:
 * - packages/contracts/src/contacts.ts (domain schemas)
 * - supabase/migrations/ (RLS policies for contacts tables)
 *
 * Tags:
 * - domain: contacts
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: rls, relationships
 *
 * File:
 * - packages/database/src/schema/contacts.ts
 *
 * Last updated:
 * - July 23, 2026
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
} from 'drizzle-orm/pg-core';

import { workspaces } from './core.js';

/**
 * CONTACTS
 * Personal contact profiles with rich metadata and relationship tracking.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    tags: jsonb('tags').$type<string[]>(), // Array of tags: ['family', 'friend', 'work', etc.
    relationshipStrength: text('relationship_strength'), // 'close', 'moderate', 'acquaintance', 'professional'
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // workspaceIdIdx: Primary lookup for workspace-scoped queries (RLS filtering)
    workspaceIdIdx: index('contacts_workspace_id_idx').on(table.workspaceId),
    // workspaceIdEmailIdx: Supports email uniqueness checks within a workspace
    workspaceIdEmailIdx: index('contacts_workspace_id_email_idx').on(
      table.workspaceId,
      table.email,
    ),
  }),
);

/**
 * CONTACT INTERACTIONS
 * Automatic and manual logging of calls, meetings, and messages.
 */
export const contactInteractions = pgTable(
  'contact_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'call', 'meeting', 'message', 'email', 'video_call', 'in_person'
    direction: text('direction').notNull(), // 'inbound', 'outbound'
    summary: text('summary'),
    notes: text('notes'),
    context: text('context'), // Professional networking context: company, position, event, etc.
    followUpRequired: boolean('follow_up_required').notNull().default(false),
    followUpDate: timestamp('follow_up_date'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('contact_interactions_workspace_id_idx').on(table.workspaceId),
    contactIdIdx: index('contact_interactions_contact_id_idx').on(table.contactId),
    createdAtIdx: index('contact_interactions_created_at_idx').on(table.createdAt),
    followUpDateIdx: index('contact_interactions_follow_up_date_idx').on(table.followUpDate),
  }),
);

/**
 * IMPORTANT DATES
 * Birthdays, anniversaries, and other date-specific information with automated reminders.
 */
export const importantDates = pgTable(
  'important_dates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'birthday', 'anniversary', 'custom'
    label: text('label').notNull(),
    date: text('date').notNull(), // MM-DD format for recurring dates
    year: text('year'), // Optional year for non-recurring dates
    reminderEnabled: boolean('reminder_enabled').notNull().default(true),
    reminderDaysBefore: integer('reminder_days_before').default(0),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('important_dates_workspace_id_idx').on(table.workspaceId),
    contactIdIdx: index('important_dates_contact_id_idx').on(table.contactId),
    dateIdx: index('important_dates_date_idx').on(table.date),
  }),
);

/**
 * GIFT IDEAS
 * Ideas, purchased status, budget, size/preferences, and holiday lists.
 */
export const giftIdeas = pgTable(
  'gift_ideas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    idea: text('idea').notNull(),
    description: text('description'),
    budget: text('budget'), // Budget as string to avoid floating-point issues
    size: text('size'),
    preferences: text('preferences'),
    holiday: text('holiday'), // 'christmas', 'birthday', 'anniversary', etc.
    isPurchased: boolean('is_purchased').notNull().default(false),
    purchasedAt: timestamp('purchased_at'),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('gift_ideas_workspace_id_idx').on(table.workspaceId),
    contactIdIdx: index('gift_ideas_contact_id_idx').on(table.contactId),
    holidayIdx: index('gift_ideas_holiday_idx').on(table.holiday),
    isPurchasedIdx: index('gift_ideas_is_purchased_idx').on(table.isPurchased),
  }),
);

/**
 * HOUSEHOLD MEMBERS
 * Shared contact details, roles, and pet information for family/household management.
 */
export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    role: text('role'), // 'parent', 'child', 'partner', 'roommate', 'pet', etc.
    relationship: text('relationship'), // 'spouse', 'son', 'daughter', 'friend', etc.
    isPet: boolean('is_pet').notNull().default(false),
    species: text('species'), // For pets: 'dog', 'cat', etc.
    breed: text('breed'),
    birthDate: timestamp('birth_date'),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index('household_members_workspace_id_idx').on(table.workspaceId),
    contactIdIdx: index('household_members_contact_id_idx').on(table.contactId),
    roleIdx: index('household_members_role_idx').on(table.role),
  }),
);
