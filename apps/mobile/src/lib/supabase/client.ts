import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { TokenProvider } from '@life-os/api-client';

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
