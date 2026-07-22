import { z } from 'zod';

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

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
