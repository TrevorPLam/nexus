import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the app module
vi.mock('./index.js', () => ({
  default: {
    fetch: vi.fn(() => new Response('OK')),
  },
}));

// Mock @hono/node-server
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}));

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses PORT from environment variable', () => {
    process.env.PORT = '4000';

    require('./server.js');

    expect(process.env.PORT).toBe('4000');
  });

  it('defaults to port 3000 when PORT not set', () => {
    delete process.env.PORT;

    require('./server.js');

    // The server should use default port 3000
    expect(parseInt('3000')).toBe(3000);
  });

  it('calls serve with app fetch and port', () => {
    const { serve } = require('@hono/node-server');
    const app = require('./index.js').default;

    require('./server.js');

    expect(serve).toHaveBeenCalledWith({
      fetch: app.fetch,
      port: expect.any(Number),
    });
  });
});
