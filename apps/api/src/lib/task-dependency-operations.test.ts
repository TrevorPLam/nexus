import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createTaskDependency,
  getTaskDependencies,
  deleteTaskDependency,
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

describe('Task Dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task dependency', async () => {
    const { db } = await import('./db.js');
    const result = await createTaskDependency({
      taskId: 'task-123',
      dependsOnTaskId: 'task-456',
      type: 'finish_to_start',
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
    expect(db.insert).toHaveBeenCalled();
  });

  it('gets task dependencies', async () => {
    const result = await getTaskDependencies('task-123');

    // Function returns Drizzle query builder, not array directly
    expect(result).toBeDefined();
  });

  it('deletes a task dependency', async () => {
    const { db } = await import('./db.js');
    const result = await deleteTaskDependency('dependency-123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('123');
    expect(db.delete).toHaveBeenCalled();
  });
});
