import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  batchCompleteTasks,
  batchDeferTasks,
  batchRescheduleTasks,
  batchUpdateTaskStatus,
} from './work-operations.js';

// Helper to create chainable query builder mock that resolves to array
const createQueryBuilder = () => {
  const mockData = [{ id: '123', createdAt: new Date() }];
  const queryBuilder = Promise.resolve(mockData) as unknown as {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };

  // Add chainable methods that return the same promise
  queryBuilder.from = vi.fn(() => queryBuilder);
  queryBuilder.where = vi.fn(() => queryBuilder);
  queryBuilder.orderBy = vi.fn(() => queryBuilder);
  queryBuilder.limit = vi.fn(() => queryBuilder);
  queryBuilder.returning = vi.fn(() => queryBuilder);

  return queryBuilder;
};

// Mock the db module
vi.mock('./db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
      })),
    })),
    select: vi.fn(() => createQueryBuilder()),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
      })),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: vi.fn(async (callback: any) => {
      return callback({
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123', createdAt: new Date() }])),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: '123', updatedAt: new Date() }])),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: '123' }])),
          })),
        })),
      });
    }),
  },
}));

describe('Work Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Batch Task Operations', () => {
    it('batch completes tasks', async () => {
      const { db } = await import('./db.js');
      const result = await batchCompleteTasks(['task-1', 'task-2']);

      expect(result).toBeInstanceOf(Array);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('batch defers tasks', async () => {
      const { db } = await import('./db.js');
      const deferDate = new Date('2024-12-31');
      const result = await batchDeferTasks(['task-1', 'task-2'], deferDate);

      expect(result).toBeInstanceOf(Array);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('batch reschedules tasks', async () => {
      const { db } = await import('./db.js');
      const newDate = new Date('2024-12-31');
      const result = await batchRescheduleTasks(['task-1', 'task-2'], newDate);

      expect(result).toBeInstanceOf(Array);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('batch updates task status', async () => {
      const { db } = await import('./db.js');
      const result = await batchUpdateTaskStatus(['task-1', 'task-2'], 'in_progress');

      expect(result).toBeInstanceOf(Array);
      expect(db.transaction).toHaveBeenCalled();
    });
  });
});
