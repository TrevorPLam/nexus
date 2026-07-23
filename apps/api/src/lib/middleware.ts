import {
  workspaceMemberships,
  appUsers,
  tasks,
  projects,
  events,
  calendars,
  schedulingLinks,
} from '@life-os/database';
import { eq, and, sql } from 'drizzle-orm';
import { Context, type Next } from 'hono';

import { getAuthUser } from './auth.js';
import { db } from './db.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const user = await getAuthUser(authHeader ?? null);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Set user in context for use in route handlers
  c.set('user', user);

  return next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const user = await getAuthUser(authHeader ?? null);

  if (user) {
    c.set('user', user);
  }
  return next();
}

export async function requireWorkspaceMembership(c: Context, next: Next) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const workspaceId = c.req.param('workspaceId') || c.req.query('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }

  try {
    // Get the app_user record for the authenticated user
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.supabaseUserId, user.id));

    if (!appUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if user is a member of the workspace
    const [membership] = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.userId, appUser.id),
        ),
      );

    if (!membership) {
      return c.json({ error: 'Forbidden: Not a member of this workspace' }, 403);
    }

    // Set workspace context for RLS policies
    await db.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}::text, true)`);

    // Set workspace membership in context
    c.set('workspaceMembership', membership);
    return next();
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    return c.json({ error: 'Failed to verify workspace membership' }, 500);
  }
}

export async function idempotencyMiddleware(c: Context, next: Next) {
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (!idempotencyKey) {
    return next();
  }

  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const endpoint = c.req.path;
  const userId = user.id;

  try {
    // Check if this idempotency key was already used
    const result = await checkIdempotencyKey(idempotencyKey, userId, endpoint);

    if (result.isDuplicate) {
      // Return the cached response
      const status = parseInt(result.responseStatus || '200') as number;
      c.status(status as any);
      return c.json(result.responseBody);
    }

    // Store the original json method to intercept the response
    const originalJson = c.json.bind(c);

    // Override json to capture the response
    c.json = (data: unknown, init?: number | ResponseInit) => {
      const status = typeof init === 'number' ? init : init?.status || 200;

      // Store the response for idempotency
      createIdempotencyKey({
        key: idempotencyKey,
        userId,
        endpoint,
        responseStatus: String(status),
        responseBody: data as Record<string, unknown>,
      }).catch((err) => console.error('Failed to store idempotency key:', err));

      // Call original with correct signature
      if (typeof init === 'number') {
        c.status(init as any);
        return originalJson(data);
      }
      if (init?.status) {
        c.status(init.status as any);
      }
      return originalJson(data);
    };

    return next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Continue without idempotency on error
    return next();
  }
}

// Entity table mapping for workspace lookup
const entityWorkspaceMap: Record<string, any> = {
  tasks,
  projects,
  events,
  calendars,
  schedulingLinks,
};

/**
 * Middleware factory that requires entity access by deriving workspace from the entity
 * and checking if the user is a member of that workspace.
 * @param tableName - The name of the entity table (e.g., 'tasks', 'projects')
 */
export function requireEntityAccess(tableName: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const entityId = c.req.param('id');
    if (!entityId) {
      return c.json({ error: 'Entity ID required' }, 400);
    }

    try {
      const table = entityWorkspaceMap[tableName];
      if (!table) {
        return c.json({ error: 'Invalid entity type' }, 400);
      }

      // Get the entity to determine its workspace
      const [entity] = await db.select().from(table).where(eq(table.id, entityId));

      if (!entity) {
        return c.json({ error: 'Entity not found' }, 404);
      }

      // Get the app_user record for the authenticated user
      const [appUser] = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.supabaseUserId, user.id));

      if (!appUser) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Check if user is a member of the entity's workspace
      const [membership] = await db
        .select()
        .from(workspaceMemberships)
        .where(
          and(
            eq(workspaceMemberships.workspaceId, entity.workspaceId),
            eq(workspaceMemberships.userId, appUser.id),
          ),
        );

      if (!membership) {
        return c.json({ error: 'Forbidden: Not a member of this workspace' }, 403);
      }

      // Set workspace context for RLS policies
      await db.execute(
        sql`SELECT set_config('app.workspace_id', ${entity.workspaceId}::text, true)`,
      );

      // Set workspace membership in context
      c.set('workspaceMembership', membership);
      return next();
    } catch (error) {
      console.error('Error checking entity access:', error);
      return c.json({ error: 'Failed to verify entity access' }, 500);
    }
  };
}

/**
 * Middleware that requires workspace access by checking membership
 * from workspaceId in query parameters or request body.
 */
export async function requireWorkspaceAccess(c: Context, next: Next) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Try to get workspaceId from query first, then from body
  let workspaceId = c.req.query('workspaceId');
  if (!workspaceId) {
    try {
      const body = await c.req.json();
      workspaceId = body.workspaceId;
    } catch {
      // Body may not be JSON or may not exist
    }
  }

  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }

  try {
    // Get the app_user record for the authenticated user
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.supabaseUserId, user.id));

    if (!appUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if user is a member of the workspace
    const [membership] = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.userId, appUser.id),
        ),
      );

    if (!membership) {
      return c.json({ error: 'Forbidden: Not a member of this workspace' }, 403);
    }

    // Set workspace context for RLS policies
    await db.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}::text, true)`);

    // Set workspace membership in context
    c.set('workspaceMembership', membership);
    return next();
  } catch (error) {
    console.error('Error checking workspace access:', error);
    return c.json({ error: 'Failed to verify workspace access' }, 500);
  }
}
