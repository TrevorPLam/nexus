/**
 * MODULE: Next.js Supabase Server Client
 *
 * Responsibility:
 * Creates a Supabase server client bound to the current request's cookies for
 * use in Server Components and Route Handlers.
 *
 * Boundaries:
 * - Server-side only; must be called within a Next.js server context.
 * - Does not handle session refresh — middleware handles that.
 *
 * Critical invariants:
 * - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.
 * - Cookie set failures from Server Components are silently ignored (middleware
 *   refreshes sessions).
 *
 * Side effects:
 * - Reads and potentially writes cookies via the Next.js cookies() API.
 *
 * Change risk:
 * - High. Server-side authentication and data access depend on this client.
 *
 * Links:
 * - apps/web/src/lib/supabase/client.ts
 * - apps/web/src/lib/supabase/middleware.ts
 *
 * Tags:
 * - domain: authentication
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: supabase, server-components, cookies
 *
 * File:
 * - apps/web/src/lib/supabase/server.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
