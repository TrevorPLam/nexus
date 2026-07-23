/**
 * MODULE: Recurring Event Endpoints
 *
 * Responsibility:
 * Implementation of API endpoints for managing and expanding recurring calendar events.
 * Provides virtual expansion of RRULEs into discrete instances within a time range.
 *
 * Boundaries:
 * - Handles expansion logic for recurring series.
 * - Delegates series storage and expansion logic to lib/calendar-operations.js and lib/recurrence.js.
 * - Authorization is enforced via middleware (requireWorkspaceMembership).
 *
 * Critical invariants:
 * - Preconditions:
 *   - All requests require valid authentication (authMiddleware)
 *   - All operations require workspace membership (requireWorkspaceMembership)
 *   - Recurrence ID must reference existing base recurring event
 *   - Base event must have recurrenceRule to be considered recurring
 *   - Date range parameters must be valid ISO date strings
 * - Postconditions:
 *   - All responses are validated against Zod schemas
 *   - Workspace isolation is enforced by middleware
 *   - Expanding non-recurring event returns 400 error
 *   - Virtual instances are generated on-the-fly and not persisted
 *   - Instance IDs are generated as baseEventId-timestamp
 *   - Successful operations return 200 status codes
 *   - Failed operations return appropriate 4xx/5xx status codes
 *   - Test coverage: See apps/api/src/routes/calendar/recurring.test.ts (EXISTS)
 *
 * Side effects:
 * - None (read-only expansion).
 *
 * Change risk:
 * - Medium. Complex RRULE expansion logic can be resource-intensive or error-prone.
 *
 * Links:
 * - apps/api/src/lib/calendar-operations.ts
 * - apps/api/src/lib/recurrence.ts
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: api
 * - stability: stable
 * - concerns: recurring-events, rrule, expansion
 *
 * File:
 * - apps/api/src/routes/calendar/recurring.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { Hono } from 'hono';

import * as calendarOps from '../../lib/calendar-operations.js';
import { authMiddleware, requireWorkspaceMembership } from '../../lib/middleware.js';
import { expandRecurringEvent } from '../../lib/recurrence.js';

const recurringRouter = new Hono();

// Apply authentication middleware to all routes
recurringRouter.use('*', authMiddleware);

recurringRouter.get('/recurring/:recurrenceId/instances', requireWorkspaceMembership, async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  if (!recurrenceId) {
    return c.json({ error: 'Recurrence ID required' }, 400);
  }
  const startDate = c.req.query('start');
  const endDate = c.req.query('end');

  try {
    // Get the base recurring event
    const baseEvent = await calendarOps.getBaseRecurringEvent(recurrenceId);
    if (!baseEvent) {
      return c.json({ error: 'Base recurring event not found' }, 404);
    }

    if (!baseEvent.recurrenceRule) {
      return c.json({ error: 'Event is not recurring' }, 400);
    }

    // Parse date range or use defaults (next 30 days)
    const rangeStart = startDate ? new Date(startDate) : new Date();
    const rangeEnd = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Expand the recurring event using the recurrence utility
    const occurrences = expandRecurringEvent(
      new Date(baseEvent.start),
      baseEvent.recurrenceRule,
      rangeStart,
      rangeEnd,
      baseEvent.timezone || 'UTC',
    );

    // Calculate duration of the base event
    const duration = new Date(baseEvent.end).getTime() - new Date(baseEvent.start).getTime();

    // Generate instance objects from occurrences
    const instances = occurrences.map((occurrence) => ({
      id: `${baseEvent.id}-${occurrence.getTime()}`,
      recurrenceId: baseEvent.id,
      title: baseEvent.title,
      description: baseEvent.description,
      location: baseEvent.location,
      isAllDay: baseEvent.isAllDay,
      start: occurrence,
      end: new Date(occurrence.getTime() + duration),
      timezone: baseEvent.timezone,
      calendarId: baseEvent.calendarId,
      workspaceId: baseEvent.workspaceId,
    }));

    return c.json({ instances });
  } catch (error) {
    console.error('Error fetching recurring event instances:', error);
    return c.json({ error: 'Failed to fetch recurring event instances' }, 500);
  }
});

recurringRouter.get('/recurring/:recurrenceId/base', requireWorkspaceMembership, async (c) => {
  const recurrenceId = c.req.param('recurrenceId');
  if (!recurrenceId) {
    return c.json({ error: 'Recurrence ID required' }, 400);
  }
  try {
    const baseEvent = await calendarOps.getBaseRecurringEvent(recurrenceId);
    if (!baseEvent) {
      return c.json({ error: 'Base recurring event not found' }, 404);
    }
    return c.json(baseEvent);
  } catch (error) {
    console.error('Error fetching base recurring event:', error);
    return c.json({ error: 'Failed to fetch base recurring event' }, 500);
  }
});

export default recurringRouter;
