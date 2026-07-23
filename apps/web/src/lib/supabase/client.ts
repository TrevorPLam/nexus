/**
 * MODULE: Web Supabase Client
 *
 * Responsibility:
 * Initializes the Supabase browser client for the Next.js web app and provides a
 * TokenProvider implementation for authenticated requests to the Life OS API.
 *
 * Boundaries:
 * - Client-side only; relies on NEXT_PUBLIC_ environment variables.
 * - Does not manage auth state changes; AuthContext handles that.
 *
 * Critical invariants:
 * - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time.
 * - getAccessToken returns null when no session exists, which the API client must handle.
 *
 * Side effects:
 * - Creates a persistent Supabase browser client on each call.
 *
 * Change risk:
 * - High. Authentication and API access for the web app depend on this module.
 *
 * Links:
 * - apps/web/src/contexts/AuthContext.tsx
 * - packages/api-client/src/index.ts
 * - apps/web/src/hooks/useWorkProjects.ts
 *
 * Tags:
 * - domain: authentication
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: supabase-auth, web, token-provider
 *
 * File:
 * - apps/web/src/lib/supabase/client.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { createBrowserClient } from '@supabase/ssr';
import type { TokenProvider } from '@life-os/api-client';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
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
