import { describe, it, expect } from 'vitest';

import {
  IdSchema,
  WorkspaceIdSchema,
  PaginationSchema,
  DateRangeSchema,
  ErrorResponseSchema,
} from '../src/common';

describe('Common Contracts', () => {
  describe('IdSchema', () => {
    it('accepts valid UUID', () => {
      const result = IdSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid UUID', () => {
      expect(() => IdSchema.parse({ id: 'not-a-uuid' })).toThrow();
    });

    it('rejects missing id', () => {
      expect(() => IdSchema.parse({})).toThrow();
    });
  });

  describe('WorkspaceIdSchema', () => {
    it('accepts valid workspace UUID', () => {
      const result = WorkspaceIdSchema.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.workspaceId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid workspace UUID', () => {
      expect(() => WorkspaceIdSchema.parse({ workspaceId: 'not-a-uuid' })).toThrow();
    });
  });

  describe('PaginationSchema', () => {
    it('accepts valid pagination with cursor', () => {
      const result = PaginationSchema.parse({
        limit: 50,
        cursor: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.limit).toBe(50);
      expect(result.cursor).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('accepts valid pagination without cursor', () => {
      const result = PaginationSchema.parse({ limit: 50 });
      expect(result.limit).toBe(50);
      expect(result.cursor).toBeUndefined();
    });

    it('applies default limit', () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(50);
    });

    it('rejects limit over 100', () => {
      expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
    });

    it('rejects negative limit', () => {
      expect(() => PaginationSchema.parse({ limit: -1 })).toThrow();
    });

    it('rejects zero limit', () => {
      expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
    });
  });

  describe('DateRangeSchema', () => {
    it('accepts valid date range', () => {
      const result = DateRangeSchema.parse({
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      });
      expect(result.start).toBe('2024-01-01T00:00:00Z');
      expect(result.end).toBe('2024-01-02T00:00:00Z');
    });

    it('rejects start after end', () => {
      expect(() =>
        DateRangeSchema.parse({
          start: '2024-01-02T00:00:00Z',
          end: '2024-01-01T00:00:00Z',
        }),
      ).toThrow('start date must be before end date');
    });

    it('rejects invalid datetime format', () => {
      expect(() =>
        DateRangeSchema.parse({
          start: 'not-a-date',
          end: '2024-01-02T00:00:00Z',
        }),
      ).toThrow();
    });
  });

  describe('ErrorResponseSchema', () => {
    it('accepts valid error response with details', () => {
      const result = ErrorResponseSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'title', issue: 'required' },
        },
      });
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid input');
      expect(result.error.details).toEqual({ field: 'title', issue: 'required' });
    });

    it('accepts valid error response without details', () => {
      const result = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Resource not found');
      expect(result.error.details).toBeUndefined();
    });

    it('rejects missing error object', () => {
      expect(() => ErrorResponseSchema.parse({})).toThrow();
    });

    it('rejects missing code', () => {
      expect(() =>
        ErrorResponseSchema.parse({
          error: { message: 'Error' },
        }),
      ).toThrow();
    });

    it('rejects missing message', () => {
      expect(() =>
        ErrorResponseSchema.parse({
          error: { code: 'ERROR' },
        }),
      ).toThrow();
    });
  });
});
