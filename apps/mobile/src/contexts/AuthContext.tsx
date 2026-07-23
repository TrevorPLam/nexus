/**
 * MODULE: Mobile authentication context
 *
 * Responsibility:
 * Provides authentication state and workspace selection for the mobile application.
 *
 * Boundaries:
 * - Manages session lifecycle via Supabase Auth.
 * - Handles workspace selection and persistence in-memory.
 * - Triggers PowerSync data clearing on session termination.
 *
 * Critical invariants:
 * - Session state is derived from Supabase Auth.
 * - Workspace selection is scoped to the authenticated user.
 * - Sign-out or account-switch MUST clear PowerSync replica data.
 *
 * Side effects:
 * - Manages Supabase Auth session.
 * - Clears local PowerSync data on sign-out/account-switch.
 *
 * Change risk:
 * - High. Authentication and authorization. Any changes require verification with Supabase Auth and RLS policies.
 *
 * Links:
 * - apps/mobile/src/lib/supabase/client.ts
 * - apps/mobile/src/lib/powersync/database.ts
 *
 * Tags:
 * - domain: authentication
 * - risk: high
 * - layer: presentation
 * - stability: stable
 * - concerns: react-context, mobile, workspace-selection, supabase-auth
 *
 * File:
 * - apps/mobile/src/contexts/AuthContext.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

import { createClient } from '../lib/supabase/client';

interface User {
  id: string;
  email: string;
  fullName?: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  session: any | null;
  selectedWorkspace: Workspace | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  selectWorkspace: (workspace: Workspace) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(
            session?.user
              ? {
                  id: session.user.id,
                  email: session.user.email || '',
                  fullName: session.user.user_metadata?.full_name,
                }
              : null
          );
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email || '',
                fullName: session.user.user_metadata?.full_name,
              }
            : null
        );
        // Clear workspace selection on sign-out
        if (!session) {
          setSelectedWorkspace(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async () => {
    // TODO: Implement sign-in flow
    // This will integrate with Supabase Auth
    throw new Error('Sign-in not yet implemented');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // TODO: Clear PowerSync replica data
    // This requires integration with PowerSync database
    setSelectedWorkspace(null);
  };

  const selectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
  };

  const value: AuthContextValue = {
    user,
    session,
    selectedWorkspace,
    isLoading,
    signIn,
    signOut,
    selectWorkspace,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
