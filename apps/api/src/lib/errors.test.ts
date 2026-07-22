import { describe, it, expect } from 'vitest';

import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  handleApiError,
} from './errors.js';

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('creates ApiError with correct properties', () => {
      const error = new ApiError(400, 'TEST_ERROR', 'Test message', { field: 'test' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('ValidationError', () => {
    it('creates ValidationError with status 400', () => {
      const error = new ValidationError('Invalid input', { field: 'title' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('accepts details parameter', () => {
      const error = new ValidationError('Invalid input', { field: 'title' });
      expect(error.details).toEqual({ field: 'title' });
    });
  });

  describe('NotFoundError', () => {
    it('creates NotFoundError with status 404', () => {
      const error = new NotFoundError('Task', '123');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('generates message with resource and id', () => {
      const error = new NotFoundError('Task', '123');
      expect(error.message).toBe('Task with id 123 not found');
    });

    it('generates message without id', () => {
      const error = new NotFoundError('Task');
      expect(error.message).toBe('Task not found');
    });

    it('includes resource and id in details', () => {
      const error = new NotFoundError('Task', '123');
      expect(error.details).toEqual({ resource: 'Task', id: '123' });
    });
  });

  describe('UnauthorizedError', () => {
    it('creates UnauthorizedError with status 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('uses default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
    });

    it('accepts custom message', () => {
      const error = new UnauthorizedError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('ForbiddenError', () => {
    it('creates ForbiddenError with status 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('uses default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
    });

    it('accepts custom message', () => {
      const error = new ForbiddenError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('ConflictError', () => {
    it('creates ConflictError with status 409', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('accepts details parameter', () => {
      const error = new ConflictError('Resource already exists', { field: 'email' });
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('InternalServerError', () => {
    it('creates InternalServerError with status 500', () => {
      const error = new InternalServerError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('InternalServerError');
    });

    it('uses default message', () => {
      const error = new InternalServerError();
      expect(error.message).toBe('Internal server error');
    });

    it('accepts custom message', () => {
      const error = new InternalServerError('Custom error');
      expect(error.message).toBe('Custom error');
    });

    it('accepts details parameter', () => {
      const error = new InternalServerError('Custom error', { stack: '...' });
      expect(error.details).toEqual({ stack: '...' });
    });
  });
});

describe('handleApiError', () => {
  it('handles ApiError correctly', () => {
    const error = new ValidationError('Invalid input', { field: 'title' });
    const result = handleApiError(error);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'title' },
      },
    });
  });

  it('handles generic Error in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const error = new Error('Something went wrong');
    const result = handleApiError(error);
    expect(result.statusCode).toBe(500);
    expect((result.body.error as { code: string }).code).toBe('INTERNAL_SERVER_ERROR');
    expect((result.body.error as { message: string }).message).toBe('An unexpected error occurred');
    expect((result.body.error as { details?: unknown }).details).toEqual({
      message: 'Something went wrong',
    });
    process.env.NODE_ENV = originalEnv;
  });

  it('handles generic Error in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = new Error('Something went wrong');
    const result = handleApiError(error);
    expect(result.statusCode).toBe(500);
    expect((result.body.error as { code: string }).code).toBe('INTERNAL_SERVER_ERROR');
    expect((result.body.error as { message: string }).message).toBe('An unexpected error occurred');
    expect((result.body.error as { details?: unknown }).details).toBeUndefined();
    process.env.NODE_ENV = originalEnv;
  });

  it('handles unknown error', () => {
    const result = handleApiError('string error');
    expect(result.statusCode).toBe(500);
    expect((result.body.error as { code: string }).code).toBe('INTERNAL_SERVER_ERROR');
    expect((result.body.error as { message: string }).message).toBe('An unexpected error occurred');
  });
});
