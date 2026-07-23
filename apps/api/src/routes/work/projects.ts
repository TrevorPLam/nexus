import { CreateProjectRequest, UpdateProjectRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
  idempotencyMiddleware,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';
import { db } from '../../lib/db.js';
import { workspaceMemberships, appUsers, workspaces } from '@life-os/database';
import { eq } from 'drizzle-orm';

const projectsRouter = new Hono();

// Apply authentication middleware to all routes
projectsRouter.use('*', authMiddleware);

// Get user's workspaces
projectsRouter.get('/workspaces', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get the app_user record for the authenticated user
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.supabaseUserId, user.id));

    if (!appUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's workspace memberships with workspace details
    const memberships = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(eq(workspaceMemberships.userId, appUser.id));

    return c.json({ workspaces: memberships });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

projectsRouter.post(
  '/projects',
  requireWorkspaceAccess,
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

projectsRouter.get('/projects/:id', requireEntityAccess('projects'), async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }
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
    return c.json({ projects: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

projectsRouter.put(
  '/projects/:id',
  requireWorkspaceMembership,
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
    if (!id) {
      return c.json({ error: 'Invalid project ID' }, 400);
    }
    const data = c.req.valid('json');
    try {
      // Filter out undefined values to avoid type errors
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      const project = await workOps.updateProject(id, updateData);
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

projectsRouter.delete('/projects/:id', requireWorkspaceMembership, idempotencyMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }
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
