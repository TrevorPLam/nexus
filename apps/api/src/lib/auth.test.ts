import { describe, it, expect, vi, beforeEach } from 'vitest';

import { verifyAuthToken, getAuthUser, supabase, supabaseAdmin } from './auth.js';

// Mock environment variables
const originalEnv = process.env;

describe('Auth Functions', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  describe('verifyAuthToken', () => {
    it('verifies valid JWT token', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockResolvedValue({
          payload: { sub: 'user-123', email: 'test@example.com' },
        }),
      }));

      const { jwtVerify } = await import('jose');
      const result = await verifyAuthToken('valid-token');

      expect(result).toEqual({ sub: 'user-123', email: 'test@example.com' });
      expect(jwtVerify).toHaveBeenCalledWith('valid-token', expect.anything());
    });

    it('returns null for invalid token', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockRejectedValue(new Error('Invalid token')),
      }));

      const result = await verifyAuthToken('invalid-token');

      expect(result).toBeNull();
    });

    it('returns null for malformed token', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockRejectedValue(new Error('Malformed JWT')),
      }));

      const result = await verifyAuthToken('malformed-token');

      expect(result).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    it('returns null when no auth header provided', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockResolvedValue({
          payload: { sub: 'user-123', email: 'test@example.com' },
        }),
      }));

      const result = await getAuthUser(null);

      expect(result).toBeNull();
    });

    it('returns null when auth header is empty string', async () => {
      const result = await getAuthUser('');

      expect(result).toBeNull();
    });

    it('extracts and verifies Bearer token', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockResolvedValue({
          payload: { sub: 'user-123', email: 'test@example.com' },
        }),
      }));

      const result = await getAuthUser('Bearer valid-token');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('returns null for invalid Bearer token', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockRejectedValue(new Error('Invalid token')),
      }));

      const result = await getAuthUser('Bearer invalid-token');

      expect(result).toBeNull();
    });

    it('handles token without Bearer prefix', async () => {
      vi.mock('jose', () => ({
        jwtVerify: vi.fn().mockResolvedValue({
          payload: { sub: 'user-123', email: 'test@example.com' },
        }),
      }));

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
