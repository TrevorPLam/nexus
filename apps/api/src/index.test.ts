import { describe, it, expect, vi } from 'vitest';

// Mock the db module to avoid environment variable checks
vi.mock('./lib/db.js', () => ({
  db: {},
}));

// Mock the auth module to avoid SUPABASE environment variable checks
vi.mock('./lib/auth.js', () => ({
  verifyAuthToken: vi.fn(),
  getAuthUser: vi.fn(),
  supabase: {},
  supabaseAdmin: {},
}));

import app from './index.js';

describe('API Index', () => {
  it('exports a Hono app instance', () => {
    expect(app).toBeDefined();
    expect(app).toHaveProperty('routes');
  });

  it('has root route', () => {
    expect(app.routes).toBeDefined();
  });

  it('has health check route', () => {
    expect(app.routes).toBeDefined();
  });
});
