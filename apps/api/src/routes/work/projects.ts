import { CreateProjectRequest, UpdateProjectRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import {
  authMiddleware,
  requireWorkspaceMembership,
  idempotencyMiddleware,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const projectsRouter = new Hono();

// Apply authentication middleware to all routes
projectsRouter.use('*', authMiddleware);

projectsRouter.post(
  '/projects',
  idempotencyMiddleware,
  validator('json', (value, c) => {
    const parsed = CreateProjectRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const project = await workOps.createProject({
        ...data,
        status: 'active',
        metadata: null,
      });
      return c.json(project, 201);
    } catch (error) {
      console.error('Error creating project:', error);
      return c.json({ error: 'Failed to create project' }, 500);
    }
  },
);

projectsRouter.get('/projects/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await workOps.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

projectsRouter.get('/workspaces/:workspaceId/projects', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await workOps.getProjectsByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

projectsRouter.put(
  '/projects/:id',
  idempotencyMiddleware,
  validator('json', (value, c) => {
    const parsed = UpdateProjectRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    try {
      const project = await workOps.updateProject(id, data);
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }
      return c.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      return c.json({ error: 'Failed to update project' }, 500);
    }
  },
);

projectsRouter.delete('/projects/:id', idempotencyMiddleware, async (c) => {
  const id = c.req.param('id');
  try {
    const project = await workOps.deleteProject(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

export default projectsRouter;
