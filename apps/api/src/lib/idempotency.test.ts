import { describe, it, expect, vi, beforeEach } from 'vitest';

import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
      })),
    })),
  },
}));

describe('Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkIdempotencyKey', () => {
    it('returns isDuplicate: false when no existing key found', async () => {
      const result = await checkIdempotencyKey('test-key', 'user-123', '/api/tasks');
      expect(result).toEqual({ isDuplicate: false });
    });

    it('returns isDuplicate: true with cached response when key exists', async () => {
      const { db } = await import('./db.js');
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve([
                {
                  responseStatus: '200',
                  responseBody: { data: 'cached' },
                },
              ]),
            ),
          })),
        })),
      });

      const result = await checkIdempotencyKey('test-key', 'user-123', '/api/tasks');
      expect(result).toEqual({
        isDuplicate: true,
        responseStatus: '200',
        responseBody: { data: 'cached' },
      });
    });
  });

  describe('createIdempotencyKey', () => {
    it('creates idempotency key with correct expiry', async () => {
      const result = await createIdempotencyKey({
        key: 'test-key',
        userId: 'user-123',
        endpoint: '/api/tasks',
        responseStatus: '201',
        responseBody: { id: 'task-123' },
      });

      expect(result).toEqual({ id: '123' });
    });

    it('sets expiry to 48 hours from now', async () => {
      const now = new Date();
      const future = new Date();
      future.setHours(future.getHours() + 48);

      await createIdempotencyKey({
        key: 'test-key',
        userId: 'user-123',
        endpoint: '/api/tasks',
        responseStatus: '201',
        responseBody: { id: 'task-123' },
      });

      // Verify the expiry is approximately 48 hours
      const { db } = await import('./db.js');
      const insertCall = (db.insert as any).mock.calls[0];
      const expiresAt = insertCall[1].expiresAt;
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(48, 0);
    });
  });
});
