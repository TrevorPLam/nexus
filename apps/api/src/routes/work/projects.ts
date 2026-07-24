/**
 * MODULE: Project and Workspace Endpoints
 *
 * Responsibility:
 * Implements API endpoints for workspace membership lookup, project CRUD, and
 * paginated project listing scoped to a workspace.
 *
 * Boundaries:
 * - Handles HTTP request/response cycle and input validation for projects.
 * - Delegates persistence and business logic to lib/work-operations.js.
 * - Authorization is enforced via middleware.
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - Create/update/delete operations require workspace access (requireWorkspaceAccess)
 *   - Create/update/delete operations require idempotency middleware
 *   - Get by ID operations require entity access (requireEntityAccess)
 *   - Input data must pass Zod validation from @life-os/contracts
 *   - Workspace membership is resolved from authenticated app_user record
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Project mutations are idempotent when idempotency key provided
 *   - Project deletion soft-deletes (sets status to 'deleted')
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/work/projects.test.ts (EXISTS)
 *
 * Side effects:
 * - Database writes via work-operations.js.
 *
 * Change risk:
 * - High. Core project management functionality; changes affect all work views.
 *
 * Links:
 * - apps/api/src/lib/work-operations.ts
 * - packages/contracts/src/work.ts
 * - apps/api/src/lib/middleware.ts
 *
 * Tags:
 * - domain: work
 * - risk: high
 * - layer: api
 * - stability: stable
 * - concerns: projects, workspaces, crud
 *
 * File:
 * - apps/api/src/routes/work/projects.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { CreateProjectRequest, UpdateProjectRequest } from '@life-os/contracts';
import { workspaceMemberships, appUsers, workspaces } from '@life-os/database';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { extractCommandContext } from '../../lib/command-context.js';
import { db } from '../../lib/db.js';
import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
  idempotencyMiddleware,
} from '../../lib/middleware.js';
import * as workOps from '../../lib/work-operations.js';

const projectsRouter = new Hono();

// Apply authentication middleware to all routes
projectsRouter.use('*', authMiddleware);

// Get user's workspaces
projectsRouter.get('/workspaces', async (c) => {
  const user = c.get('user') as { id: string } | undefined;
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
      const context = await extractCommandContext(c);
      const project = await workOps.createProject(
        {
          ...data,
          status: 'active',
          metadata: null,
        },
        context,
      );
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
  if (!workspaceId) {
    return c.json({ error: 'Invalid workspace ID' }, 400);
  }
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  // Validate cursor format if provided
  let parsedCursor: string | undefined;
  if (cursor) {
    try {
      JSON.parse(cursor);
      parsedCursor = cursor;
    } catch {
      return c.json({ error: 'Invalid cursor format' }, 400);
    }
  }

  try {
    const result = await workOps.getProjectsByWorkspace(
      workspaceId,
      limit,
      parsedCursor,
      includeDeleted,
    );
    return c.json({
      projects: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
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
      const context = await extractCommandContext(c);
      // Filter out undefined values to avoid type errors
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      );
      const project = await workOps.updateProject(id, updateData, context);
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

projectsRouter.delete(
  '/projects/:id',
  requireWorkspaceMembership,
  idempotencyMiddleware,
  async (c) => {
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
  },
);

export default projectsRouter;
