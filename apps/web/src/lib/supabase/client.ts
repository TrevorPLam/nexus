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
