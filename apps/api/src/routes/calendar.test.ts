import { describe, it, expect, vi } from 'vitest';

import calendarRouter from './calendar.js';

// Mock the sub-routers
vi.mock('./calendar/attendees.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./calendar/calendars.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./calendar/events.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

vi.mock('./calendar/recurring.js', () => ({
  default: new (class {
    routes = new Map();
  })(),
}));

describe('Calendar Routes', () => {
  it('exports a calendar router', () => {
    expect(calendarRouter).toBeDefined();
  });

  it('is a Hono instance', () => {
    expect(calendarRouter).toHaveProperty('routes');
  });

  it('responds to GET requests', async () => {
    const res = await calendarRouter.request('/');
    expect(res.status).toBe(404); // No routes defined yet
  });

  it('has routes property that is a Map', () => {
    expect(calendarRouter.routes).toBeInstanceOf(Map);
  });
});
