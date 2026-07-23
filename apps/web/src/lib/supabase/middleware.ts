/**
 * MODULE: Next.js Supabase Middleware (Session Refresh)
 *
 * Responsibility:
 * Intercepts every incoming request to refresh the Supabase auth session and
 * redirects unauthenticated users to the login page (except for /auth routes).
 *
 * Boundaries:
 * - Runs in the Next.js middleware edge runtime.
 * - Does not perform authorization or data access — only session validation.
 *
 * Critical invariants:
 * - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.
 * - Unauthenticated requests to non-/auth paths are redirected to /auth/login.
 * - Authenticated requests pass through with refreshed cookies.
 *
 * Side effects:
 * - Mutates request cookies to propagate refreshed session tokens.
 * - May return a redirect response.
 *
 * Change risk:
 * - High. Controls authentication gate for the entire web app.
 *
 * Links:
 * - apps/web/src/lib/supabase/client.ts
 * - apps/web/src/lib/supabase/server.ts
 * - apps/web/src/contexts/AuthContext.tsx
 *
 * Tags:
 * - domain: authentication
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: middleware, session-refresh, redirect
 *
 * File:
 * - apps/web/src/lib/supabase/middleware.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request,
  });
}
