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
