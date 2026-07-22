import { workspaceMemberships, appUsers } from '@life-os/database';
import { eq, and } from 'drizzle-orm';
import { Context, Next } from 'hono';

import { getAuthUser } from './auth';
import { db } from './db';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const user = await getAuthUser(authHeader);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Set user in context for use in route handlers
  c.set('user', user);
  await next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const user = await getAuthUser(authHeader);

  if (user) {
    c.set('user', user);
  }
  await next();
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
    const [appUser] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.supabaseUserId, user.id));

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
          eq(workspaceMemberships.userId, appUser.id)
        )
      );

    if (!membership) {
      return c.json({ error: 'Forbidden: Not a member of this workspace' }, 403);
    }

    // Set workspace membership in context
    c.set('workspaceMembership', membership);
    await next();
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    return c.json({ error: 'Failed to verify workspace membership' }, 500);
  }
}

export async function idempotencyMiddleware(c: Context, next: Next) {
  const idempotencyKey = c.req.header('Idempotency-Key');
  
  if (!idempotencyKey) {
    await next();
    return;
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
      const status = parseInt(result.responseStatus) as number;
      return c.json(result.responseBody, status);
    }

    // Store the original json method to intercept the response
    const originalJson = c.json.bind(c);
    
    // Override json to capture the response
    c.json = (data: unknown, init?: number | ResponseInit) => {
      const status = typeof init === 'number' ? init : (init?.status || 200);
      
      // Store the response for idempotency
      createIdempotencyKey({
        key: idempotencyKey,
        userId,
        endpoint,
        responseStatus: String(status),
        responseBody: data,
      }).catch(err => console.error('Failed to store idempotency key:', err));
      
      return originalJson(data, init);
    };

    await next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Continue without idempotency on error
    await next();
  }
}
