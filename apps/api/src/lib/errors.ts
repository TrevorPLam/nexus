/**
 * MODULE: API Error Handling
 *
 * Responsibility:
 * Provides structured error types and a unified error handler for the API,
 * ensuring consistent error responses across all endpoints.
 *
 * Boundaries:
 * - Pure error definitions; no external service calls.
 * - Used by route handlers and middleware for error normalization.
 *
 * Critical invariants:
 * - All errors include a status code, error code, and message.
 * - Sensitive details are only exposed in development mode.
 * - handleApiError converts any error to a consistent response format.
 *
 * Side effects:
 * - Logs unexpected errors to console.
 *
 * Change risk:
 * - Low. Changes affect error message format but not system behavior.
 *
 * Links:
 * - apps/api/src/lib/middleware.ts (error handling in routes)
 *
 * Tags:
 * - domain: error-handling
 * - risk: low
 * - layer: infrastructure
 * - stability: stable
 * - concerns: validation, http
 *
 * File:
 * - apps/api/src/lib/errors.ts
 *
 * Last updated:
 * - July 22, 2026
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(404, 'NOT_FOUND', message, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
    this.name = 'InternalServerError';
  }
}

export function handleApiError(error: unknown): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? { message: error.message } : undefined,
        },
      },
    };
  }

  console.error('Unknown error:', error);
  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  };
}
