import { describe, it, expect, vi } from 'vitest';

import workRouter from './work.js';

// Mock the sub-routers
vi.mock('./work/batch-operations.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./work/projects.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./work/task-dependencies.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./work/task-notes.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./work/tasks.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

describe('Work Routes', () => {
  it('exports a work router', () => {
    expect(workRouter).toBeDefined();
  });

  it('is a Hono instance', () => {
    expect(workRouter).toHaveProperty('routes');
  });

  it('responds to GET requests', async () => {
    const res = await workRouter.request('/');
    expect(res.status).toBe(404); // No routes defined yet
  });

  it('has routes property that is a Map', () => {
    expect(workRouter.routes).toBeInstanceOf(Map);
  });
});
