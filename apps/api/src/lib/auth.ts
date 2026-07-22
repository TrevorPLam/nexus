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
const JWT_SECRET = process.env.JWT_SECRET || new TextEncoder().encode(supabaseAnonKey);

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
