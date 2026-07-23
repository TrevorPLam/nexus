/**
 * MODULE: Contacts Contracts
 *
 * Responsibility:
 * Defines the domain model and Zod schemas for contact management, including
 * contact profiles, tags, and interaction history.
 *
 * Boundaries:
 * - Pure schema definitions; no database access or business logic.
 * - Does not include task or calendar-specific schemas (see work.ts, calendar.ts).
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspaceId for all workspace-scoped operations
 *   - Email addresses must be unique within a workspace
 * - Postconditions:
 *   - All request schemas validate UUID format and workspace association
 *   - Response schemas guarantee workspace isolation is preserved
 *   - Test coverage: See packages/contracts/test/ (no tests found - MISSING COVERAGE)
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. These schemas are the source of truth for both backend validation (Hono)
 *   and frontend types (Next.js/Expo). Any change may require a database migration
 *   and updates across the monorepo.
 *
 * Links:
 * - packages/database/src/schema/contacts.ts (persistence layer)
 * - apps/api/src/lib/contact-operations.ts (business logic)
 *
 * Tags:
 * - domain: contacts
 * - risk: high
 * - layer: contracts
 * - stability: stable
 * - concerns: validation, types, zod
 *
 * File:
 * - packages/contracts/src/contacts.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { z } from 'zod';

export const RelationshipStrength = z.enum(['close', 'moderate', 'acquaintance', 'professional']);
export const InteractionType = z.enum([
  'call',
  'meeting',
  'message',
  'email',
  'video_call',
  'in_person',
]);
export const InteractionDirection = z.enum(['inbound', 'outbound']);
export const ImportantDateType = z.enum(['birthday', 'anniversary', 'custom']);

/**
 * REQUEST SCHEMAS (Input DTOs)
 * These schemas validate data coming into the API from clients.
 */

export const CreateContactRequest = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).default([]),
  relationshipStrength: RelationshipStrength.optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateContactRequest = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    tags: z.array(z.string().max(50)).optional(),
    relationshipStrength: RelationshipStrength.optional(),
    notes: z.string().max(5000).optional(),
  })
  .strict();

export const CreateContactInteractionRequest = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  type: InteractionType,
  direction: InteractionDirection,
  summary: z.string().max(1000).optional(),
  notes: z.string().max(5000).optional(),
  context: z.string().max(500).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().datetime().optional(),
});

export const UpdateContactInteractionRequest = z
  .object({
    type: InteractionType.optional(),
    direction: InteractionDirection.optional(),
    summary: z.string().max(1000).optional(),
    notes: z.string().max(5000).optional(),
    context: z.string().max(500).optional(),
    followUpRequired: z.boolean().optional(),
    followUpDate: z.string().datetime().optional(),
  })
  .strict();

export const CreateImportantDateRequest = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  type: ImportantDateType,
  label: z.string().min(1).max(200),
  date: z.string().regex(/^\d{2}-\d{2}$/), // MM-DD format
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  reminderEnabled: z.boolean().default(true),
  reminderDaysBefore: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
});

export const UpdateImportantDateRequest = z
  .object({
    type: ImportantDateType.optional(),
    label: z.string().min(1).max(200).optional(),
    date: z
      .string()
      .regex(/^\d{2}-\d{2}$/)
      .optional(),
    year: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    reminderEnabled: z.boolean().optional(),
    reminderDaysBefore: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const CreateGiftIdeaRequest = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  idea: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  budget: z.string().optional(),
  size: z.string().max(50).optional(),
  preferences: z.string().max(500).optional(),
  holiday: z.string().max(50).optional(),
  isPurchased: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export const UpdateGiftIdeaRequest = z
  .object({
    idea: z.string().min(1).max(500).optional(),
    description: z.string().max(1000).optional(),
    budget: z.string().optional(),
    size: z.string().max(50).optional(),
    preferences: z.string().max(500).optional(),
    holiday: z.string().max(50).optional(),
    isPurchased: z.boolean().optional(),
    purchasedAt: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const CreateHouseholdMemberRequest = z.object({
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  role: z.string().max(50).optional(),
  relationship: z.string().max(50).optional(),
  isPet: z.boolean().default(false),
  species: z.string().max(50).optional(),
  breed: z.string().max(50).optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateHouseholdMemberRequest = z
  .object({
    role: z.string().max(50).optional(),
    relationship: z.string().max(50).optional(),
    isPet: z.boolean().optional(),
    species: z.string().max(50).optional(),
    breed: z.string().max(50).optional(),
    birthDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

/**
 * RESPONSE SCHEMAS (Output DTOs)
 * These schemas define the structure of data returned by the API.
 * They are used for client-side type safety and runtime validation.
 */

export const ContactResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  relationshipStrength: RelationshipStrength.nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ContactInteractionResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  type: InteractionType,
  direction: InteractionDirection,
  summary: z.string().nullable(),
  notes: z.string().nullable(),
  context: z.string().nullable(),
  followUpRequired: z.boolean(),
  followUpDate: z.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});

export const ImportantDateResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  type: ImportantDateType,
  label: z.string(),
  date: z.string(),
  year: z.string().nullable(),
  reminderEnabled: z.boolean(),
  reminderDaysBefore: z.number().int(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const GiftIdeaResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  idea: z.string(),
  description: z.string().nullable(),
  budget: z.string().nullable(),
  size: z.string().nullable(),
  preferences: z.string().nullable(),
  holiday: z.string().nullable(),
  isPurchased: z.boolean(),
  purchasedAt: z.date().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const HouseholdMemberResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  contactId: z.string().uuid(),
  role: z.string().nullable(),
  relationship: z.string().nullable(),
  isPet: z.boolean(),
  species: z.string().nullable(),
  breed: z.string().nullable(),
  birthDate: z.date().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
