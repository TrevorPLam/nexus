/**
 * MODULE: Mobile Supabase Client
 *
 * Responsibility:
 * Initializes the Supabase client for the mobile application and provides
 * a TokenProvider implementation for authenticated API requests.
 *
 * Boundaries:
 * - Specific to the mobile (Expo) environment.
 * - Bridges Supabase Auth with the shared API client.
 *
 * Critical invariants:
 * - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be configured.
 * - getAccessToken retrieves the current session's JWT from Supabase.
 *
 * Side effects:
 * - Initializes a persistent Supabase client.
 *
 * Change risk:
 * - High. Authentication and API access depend on this module.
 *
 * Links:
 * - apps/mobile/src/contexts/AuthContext.tsx (auth context usage)
 * - packages/api-client/src/index.ts (TokenProvider interface)
 *
 * Tags:
 * - domain: authentication
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: supabase-auth, mobile, expo
 *
 * File:
 * - apps/mobile/src/lib/supabase/client.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import type { TokenProvider } from '@life-os/api-client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export function createTokenProvider(): TokenProvider {
  const supabase = createClient();

  return {
    async getAccessToken(): Promise<string | null> {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        return null;
      }

      return session?.access_token ?? null;
    },
  };
}
