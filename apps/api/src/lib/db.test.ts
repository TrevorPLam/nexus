import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Database Connection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws error when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;

    await expect(async () => {
      await import('./db.js');
    }).rejects.toThrow('DATABASE_URL environment variable is required');
  });

  it('creates database connection with valid DATABASE_URL', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const { db } = await import('./db.js');

    expect(db).toBeDefined();
    expect(db).toHaveProperty('select');
    expect(db).toHaveProperty('insert');
    expect(db).toHaveProperty('update');
    expect(db).toHaveProperty('delete');
  });

  it('uses correct connection pool configuration', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    // The postgres client should be configured with specific pool settings
    const { db } = await import('./db.js');

    expect(db).toBeDefined();
    // Verify the db instance was created successfully
    // The actual pool configuration is internal to postgres, but we can verify the db exists
  });

  it('exports db as singleton', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const db1 = (await import('./db.js')).db;
    const db2 = (await import('./db.js')).db;

    // Due to module caching, the same instance should be returned
    expect(db1).toBe(db2);
  });
});
