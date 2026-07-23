/**
 * MODULE: Calendar Endpoints
 *
 * Responsibility:
 * Implementation of API endpoints for calendar management, including creation,
 * retrieval, updates, and deletion.
 *
 * Boundaries:
 * - Handles HTTP request/response cycle and input validation for calendars.
 * - Delegates business logic and persistence to lib/calendar-operations.js.
 * - Authorization is enforced via middleware (requireWorkspaceAccess, requireEntityAccess).
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - Create/update operations require workspace access (requireWorkspaceAccess)
 *   - Delete operations require workspace membership (requireWorkspaceMembership)
 *   - Get by ID operations require entity access (requireEntityAccess)
 *   - Input data must pass Zod validation from @life-os/contracts
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Calendar workspaceId cannot be changed after creation
 *   - Successful operations return 200-201 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/calendar/calendars.test.ts (EXISTS)
 *
 * Side effects:
 * - Database writes via calendar-operations.js.
 *
 * Change risk:
 * - High. Core application functionality for calendar organization.
 *
 * Links:
 * - apps/api/src/lib/calendar-operations.ts
 * - packages/contracts/src/calendar.ts
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: api
 * - stability: stable
 * - concerns: calendars, crud
 *
 * File:
 * - apps/api/src/routes/calendar/calendars.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { CreateCalendarRequest, UpdateCalendarRequest } from '@life-os/contracts';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import * as calendarOps from '../../lib/calendar-operations.js';
import {
  authMiddleware,
  requireWorkspaceMembership,
  requireEntityAccess,
  requireWorkspaceAccess,
} from '../../lib/middleware.js';

const calendarsRouter = new Hono();

// Apply authentication middleware to all routes
calendarsRouter.use('*', authMiddleware);

calendarsRouter.post(
  '/calendars',
  requireWorkspaceAccess,
  validator('json', (value, c) => {
    const parsed = CreateCalendarRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const data = c.req.valid('json');
    try {
      const calendar = await calendarOps.createCalendar({
        ...data,
        isDefault: data.isDefault || false,
        provider: data.provider || 'local',
        metadata: null,
      });
      return c.json(calendar, 201);
    } catch (error) {
      console.error('Error creating calendar:', error);
      return c.json({ error: 'Failed to create calendar' }, 500);
    }
  },
);

calendarsRouter.get('/calendars/:id', requireEntityAccess('calendars'), async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Calendar ID required' }, 400);
  }
  try {
    const calendar = await calendarOps.getCalendarById(id);
    if (!calendar) {
      return c.json({ error: 'Calendar not found' }, 404);
    }
    return c.json(calendar);
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return c.json({ error: 'Failed to fetch calendar' }, 500);
  }
});

calendarsRouter.get('/workspaces/:workspaceId/calendars', requireWorkspaceMembership, async (c) => {
  const workspaceId = c.req.param('workspaceId');
  if (!workspaceId) {
    return c.json({ error: 'Workspace ID required' }, 400);
  }
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await calendarOps.getCalendarsByWorkspace(workspaceId, limit, cursor);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return c.json({ error: 'Failed to fetch calendars' }, 500);
  }
});

calendarsRouter.put(
  '/calendars/:id',
  requireWorkspaceMembership,
  validator('json', (value, c) => {
    const parsed = UpdateCalendarRequest.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Calendar ID required' }, 400);
    }
    const data = c.req.valid('json');
    try {
      const calendar = await calendarOps.updateCalendar(id, data as any);
      if (!calendar) {
        return c.json({ error: 'Calendar not found' }, 404);
      }
      return c.json(calendar);
    } catch (error) {
      console.error('Error updating calendar:', error);
      return c.json({ error: 'Failed to update calendar' }, 500);
    }
  },
);

calendarsRouter.delete('/calendars/:id', requireWorkspaceMembership, async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Calendar ID required' }, 400);
  }
  try {
    const calendar = await calendarOps.deleteCalendar(id);
    if (!calendar) {
      return c.json({ error: 'Calendar not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return c.json({ error: 'Failed to delete calendar' }, 500);
  }
});

export default calendarsRouter;
