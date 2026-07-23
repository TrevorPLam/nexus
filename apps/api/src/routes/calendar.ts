/**
 * MODULE: Calendar Domain Router
 *
 * Responsibility:
 * Aggregates all calendar-related sub-routers (calendars, events, attendees,
 * recurring events, scheduling links) into a single Hono router mounted under /v1/calendar.
 *
 * Boundaries:
 * - Routing aggregation only; endpoint implementations live in ./calendar/.
 * - All authorization is handled by sub-router middleware.
 *
 * Critical invariants:
 * - All sub-routers are mounted at the root level of this router.
 * - Mount order must not create path collisions.
 *
 * Side effects:
 * - Registers calendar sub-routes for the API.
 *
 * Change risk:
 * - Low. Only affects route aggregation and discovery.
 *
 * Links:
 * - apps/api/src/index.ts
 * - apps/api/src/routes/calendar/*
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: api
 * - stability: stable
 * - concerns: routing, aggregation
 *
 * File:
 * - apps/api/src/routes/calendar.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { OpenAPIHono } from '@hono/zod-openapi';

import attendeesRouter from './calendar/attendees.js';
import calendarsRouter from './calendar/calendars.js';
import eventsRouter from './calendar/events.js';
import recurringRouter from './calendar/recurring.js';
import schedulingLinksRouter from './calendar/scheduling-links.js';

const calendarRouter = new OpenAPIHono();

// Mount all calendar route modules
calendarRouter.route('/', calendarsRouter);
calendarRouter.route('/', eventsRouter);
calendarRouter.route('/', attendeesRouter);
calendarRouter.route('/', recurringRouter);
calendarRouter.route('/', schedulingLinksRouter);

export default calendarRouter;
