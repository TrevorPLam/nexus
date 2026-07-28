import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createProject,
  getProjectById,
  getProjectsByWorkspace,
  updateProject,
  deleteProject,
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

describe('Project Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project CRUD', () => {
    it('creates a project', async () => {
      const result = await createProject({
        workspaceId: 'workspace-123',
        name: 'My Project',
        status: 'active',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets project by id', async () => {
      const result = await getProjectById('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('gets projects by workspace with pagination', async () => {
      const result = await getProjectsByWorkspace('workspace-123', 50);

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
      expect(result.nextCursor).toBeDefined();
    });

    it('updates a project', async () => {
      const result = await updateProject('project-123', { name: 'Updated Project' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('deletes a project (soft delete)', async () => {
      const result = await deleteProject('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });
});
