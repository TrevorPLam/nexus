import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import projectsRouter from './projects.js';

// Mock the work operations module
vi.mock('../../lib/work-operations.js', () => ({
  createProject: vi.fn(() => Promise.resolve({ id: '123', name: 'Test Project' })),
  getProjectById: vi.fn(() => Promise.resolve({ id: '123', name: 'Test Project' })),
  getProjectsByWorkspace: vi.fn(() =>
    Promise.resolve({ items: [], hasMore: false, nextCursor: null }),
  ),
  updateProject: vi.fn(() => Promise.resolve({ id: '123', name: 'Updated Project' })),
  deleteProject: vi.fn(() => Promise.resolve({ id: '123' })),
}));

// Mock the auth middleware
vi.mock('../../lib/middleware.js', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    await next();
  },
  requireWorkspaceMembership: async (c: Context, next: Next) => {
    c.set('workspaceId', 'test-workspace-id');
    await next();
  },
  idempotencyMiddleware: async (c: Context, next: Next) => {
    await next();
  },
}));

describe('Work Projects Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a project', async () => {
    const client = testClient(projectsRouter);
    const { createProject } = await import('../../lib/work-operations.js');

    const response = await client.projects.$post({
      json: {
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Project',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(createProject).toHaveBeenCalled();
  });

  it('gets project by id', async () => {
    const client = testClient(projectsRouter);
    const { getProjectById } = await import('../../lib/work-operations.js');

    const response = await client.projects[':id'].$get({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(getProjectById).toHaveBeenCalled();
  });

  it('gets projects by workspace', async () => {
    const client = testClient(projectsRouter);
    const { getProjectsByWorkspace } = await import('../../lib/work-operations.js');

    const response = await client.workspaces[':workspaceId'].projects.$get({
      param: { workspaceId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(getProjectsByWorkspace).toHaveBeenCalled();
  });

  it('updates a project', async () => {
    const client = testClient(projectsRouter);
    const { updateProject } = await import('../../lib/work-operations.js');

    const response = await client.projects[':id'].$put({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
      json: { name: 'Updated Project' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(updateProject).toHaveBeenCalled();
  });

  it('deletes a project', async () => {
    const client = testClient(projectsRouter);
    const { deleteProject } = await import('../../lib/work-operations.js');

    const response = await client.projects[':id'].$delete({
      param: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(deleteProject).toHaveBeenCalled();
  });
});
