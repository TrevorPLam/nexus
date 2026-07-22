import { describe, it, expect, vi } from 'vitest';

import {
  authMiddleware,
  optionalAuthMiddleware,
  requireWorkspaceMembership,
} from './middleware.js';

// Mock dependencies
vi.mock('./auth.js', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('./db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

vi.mock('./idempotency.js', () => ({
  checkIdempotencyKey: vi.fn(() => Promise.resolve({ isDuplicate: false })),
  createIdempotencyKey: vi.fn(() => Promise.resolve({ id: '123' })),
}));

describe('Middleware', () => {
  describe('authMiddleware', () => {
    it('returns 401 when no auth header', async () => {
      const c = {
        req: {
          header: vi.fn(() => undefined),
        },
        json: vi.fn(),
        set: vi.fn(),
      };
      const next = vi.fn();

      const { getAuthUser } = await import('./auth.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getAuthUser as any).mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await authMiddleware(c as any, next);
      expect(c.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('sets user in context when auth succeeds', async () => {
      const c = {
        req: {
          header: vi.fn(() => 'Bearer token'),
        },
        json: vi.fn(),
        set: vi.fn(),
      };
      const next = vi.fn();

      const { getAuthUser } = await import('./auth.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getAuthUser as any).mockResolvedValue({ id: 'user-123' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await authMiddleware(c as any, next);
      expect(c.set).toHaveBeenCalledWith('user', { id: 'user-123' });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('does not set user when no auth header', async () => {
      const c = {
        req: {
          header: vi.fn(() => undefined),
        },
        set: vi.fn(),
      };
      const next = vi.fn();

      const { getAuthUser } = await import('./auth.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getAuthUser as any).mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await optionalAuthMiddleware(c as any, next);
      expect(c.set).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('sets user in context when auth succeeds', async () => {
      const c = {
        req: {
          header: vi.fn(() => 'Bearer token'),
        },
        set: vi.fn(),
      };
      const next = vi.fn();

      const { getAuthUser } = await import('./auth.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getAuthUser as any).mockResolvedValue({ id: 'user-123' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await optionalAuthMiddleware(c as any, next);
      expect(c.set).toHaveBeenCalledWith('user', { id: 'user-123' });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireWorkspaceMembership', () => {
    it('returns 401 when no user in context', async () => {
      const c = {
        get: vi.fn(() => undefined),
        req: {
          param: vi.fn(() => undefined),
          query: vi.fn(() => undefined),
        },
        json: vi.fn(),
      };
      const next = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireWorkspaceMembership(c as any, next);
      expect(c.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when no workspaceId provided', async () => {
      const c = {
        get: vi.fn(() => ({ id: 'user-123' })),
        req: {
          param: vi.fn(() => undefined),
          query: vi.fn(() => undefined),
        },
        json: vi.fn(),
      };
      const next = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireWorkspaceMembership(c as any, next);
      expect(c.json).toHaveBeenCalledWith({ error: 'Workspace ID required' }, 400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user not a workspace member', async () => {
      const c = {
        get: vi.fn(() => ({ id: 'user-123' })),
        req: {
          param: vi.fn(() => 'workspace-123'),
          query: vi.fn(() => undefined),
        },
        json: vi.fn(),
        set: vi.fn(),
      };
      const next = vi.fn();

      const { db } = await import('./db.js');
      let callCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.select as any).mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            callCount++;
            // First call (appUsers) returns a user
            if (callCount === 1) {
              return Promise.resolve([{ id: 'app-user-123' }]);
            }
            // Second call (workspaceMemberships) returns empty
            return Promise.resolve([]);
          }),
        })),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireWorkspaceMembership(c as any, next);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Forbidden: Not a member of this workspace' },
        403,
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
