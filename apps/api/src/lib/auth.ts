/**
 * MODULE: Authentication Utilities
 *
 * Responsibility:
 * Provides core authentication services, including Supabase client initialization
 * and JWT verification for incoming API requests.
 *
 * Boundaries:
 * - Pure auth logic; does not handle authorization (see middleware.ts).
 * - Interfaces with Supabase Auth for token verification.
 *
 * Critical invariants:
 * - All tokens must be verified using the JWT_SECRET (Supabase Anon Key by default).
 * - getAuthUser extracts the sub (user ID) and email from valid JWT payloads.
 *
 * Side effects:
 * - Initializes external Supabase clients.
 *
 * Change risk:
 * - Extreme. Faulty logic here could permit unauthorized access to the entire API.
 *
 * Links:
 * - apps/api/src/lib/middleware.ts (authMiddleware usage)
 * - AGENTS.md (Security guidelines)
 *
 * Tags:
 * - domain: authentication
 * - risk: extreme
 * - layer: infrastructure
 * - stability: stable
 * - concerns: security, jwt, supabase-auth
 *
 * File:
 * - apps/api/src/lib/auth.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

// JWT verification
const encoder = new TextEncoder();
const JWT_SECRET = encoder.encode(process.env.JWT_SECRET || supabaseAnonKey);

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Extract and verify token from Authorization header
export async function getAuthUser(authHeader: string | null) {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.sub as string,
    email: payload.email as string,
  };
}
