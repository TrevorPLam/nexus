import { Hono } from 'hono';
import { describe, it, expect, vi } from 'vitest';

import calendarRouter from './calendar.js';

// Mock the sub-routers as proper Hono instances
vi.mock('./calendar/attendees.js', () => ({
  default: new Hono(),
}));

vi.mock('./calendar/calendars.js', () => ({
  default: new Hono(),
}));

vi.mock('./calendar/events.js', () => ({
  default: new Hono(),
}));

vi.mock('./calendar/recurring.js', () => ({
  default: new Hono(),
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

  it('has routes property', () => {
    expect(calendarRouter.routes).toBeDefined();
  });
});
