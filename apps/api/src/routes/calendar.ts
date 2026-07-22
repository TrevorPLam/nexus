import { Hono } from 'hono';

import attendeesRouter from './calendar/attendees.js';
import calendarsRouter from './calendar/calendars.js';
import eventsRouter from './calendar/events.js';
import recurringRouter from './calendar/recurring.js';

const calendarRouter = new Hono();

// Mount all calendar route modules
calendarRouter.route('/', calendarsRouter);
calendarRouter.route('/', eventsRouter);
calendarRouter.route('/', attendeesRouter);
calendarRouter.route('/', recurringRouter);

export default calendarRouter;
