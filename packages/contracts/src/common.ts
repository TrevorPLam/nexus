/**
 * MODULE: Common Contract Schemas
 *
 * Responsibility:
 * Defines shared Zod schemas and types used across the work and calendar
 * contract modules, including identity, pagination, dates, and error responses.
 *
 * Boundaries:
 * - Contains only cross-domain primitive schemas; no business-logic types.
 * - Work- and calendar-specific schemas belong in work.ts and calendar.ts.
 *
 * Critical invariants:
 * - Ids must be valid UUID strings.
 * - Date fields consumed from the API are ISO 8601 datetime strings.
 * - Pagination defaults must remain safe (limit capped at 100).
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. These primitives are embedded in nearly every request/response DTO.
 *
 * Links:
 * - packages/contracts/src/work.ts
 * - packages/contracts/src/calendar.ts
 *
 * Tags:
 * - domain: contracts
 * - risk: high
 * - layer: contracts
 * - stability: stable
 * - concerns: primitives, validation, pagination, errors
 *
 * File:
 * - packages/contracts/src/common.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { z } from 'zod';

// HTTP serialization schemas
// Request dates are ISO 8601 datetime strings
// Response dates are Date objects
export const HttpDate = z.string().datetime();
export const HttpDateNullable = z.string().datetime().nullable();

export const IdSchema = z.object({
  id: z.string().uuid(),
});

export const WorkspaceIdSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const DateRangeSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .refine((data) => new Date(data.start) < new Date(data.end), {
    message: 'start date must be before end date',
  });

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
