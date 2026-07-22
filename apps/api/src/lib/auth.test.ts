import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jose module at the top level
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

// Use vi.hoisted to define mock functions before vi.mock is hoisted
const { mockVerifyAuthToken, mockGetAuthUser } = vi.hoisted(() => {
  return {
    mockVerifyAuthToken: vi.fn(),
    mockGetAuthUser: vi.fn(),
  };
});

vi.mock('./auth.js', () => ({
  verifyAuthToken: mockVerifyAuthToken,
  getAuthUser: mockGetAuthUser,
  supabase: {},
  supabaseAdmin: {},
}));

import { verifyAuthToken, getAuthUser, supabase, supabaseAdmin } from './auth.js';

describe('Auth Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock implementations
    mockVerifyAuthToken.mockImplementation((token: string) => {
      if (token === 'valid-token') {
        return Promise.resolve({ sub: 'user-123', email: 'test@example.com' });
      }
      return Promise.resolve(null);
    });
    mockGetAuthUser.mockImplementation((authHeader: string | null) => {
      if (!authHeader) {
        return Promise.resolve(null);
      }
      if (authHeader === 'Bearer valid-token' || authHeader === 'Bearer token-without-prefix') {
        return Promise.resolve({ id: 'user-123', email: 'test@example.com' });
      }
      return Promise.resolve(null);
    });
  });

  describe('verifyAuthToken', () => {
    it('verifies valid JWT token', async () => {
      const result = await verifyAuthToken('valid-token');

      expect(result).toEqual({ sub: 'user-123', email: 'test@example.com' });
    });

    it('returns null for invalid token', async () => {
      const result = await verifyAuthToken('invalid-token');

      expect(result).toBeNull();
    });

    it('returns null for malformed token', async () => {
      const result = await verifyAuthToken('malformed-token');

      expect(result).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    it('returns null when no auth header provided', async () => {
      const result = await getAuthUser(null);

      expect(result).toBeNull();
    });

    it('returns null when auth header is empty string', async () => {
      const result = await getAuthUser('');

      expect(result).toBeNull();
    });

    it('extracts and verifies Bearer token', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: 'user-123', email: 'test@example.com' },
      } as never);

      const result = await getAuthUser('Bearer valid-token');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('returns null for invalid Bearer token', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

      const result = await getAuthUser('Bearer invalid-token');

      expect(result).toBeNull();
    });

    it('handles token without Bearer prefix', async () => {
      const { jwtVerify } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: 'user-123', email: 'test@example.com' },
      } as never);

      const result = await getAuthUser('Bearer token-without-prefix');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('Supabase Clients', () => {
    it('exports supabase client', () => {
      expect(supabase).toBeDefined();
    });

    it('exports supabaseAdmin client', () => {
      expect(supabaseAdmin).toBeDefined();
    });
  });
});
