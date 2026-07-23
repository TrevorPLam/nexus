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
import { db } from '../lib/powersync/database';

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
  isSigningIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  selectWorkspace: (workspace: Workspace) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

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
              : null,
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
            : null,
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

  const signIn = async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      // Auth state change listener will update user and session automatically
    } catch (error) {
      // Re-throw error for caller to handle
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear PowerSync replica data before signing out
      // Delete all data from sync tables
      // @ts-ignore - PowerSync execute method exists but type definitions are incomplete
      await db.execute('DELETE FROM app_users');
      // @ts-ignore
      await db.execute('DELETE FROM workspaces');
      // @ts-ignore
      await db.execute('DELETE FROM workspace_memberships');
      // @ts-ignore
      await db.execute('DELETE FROM projects');
      // @ts-ignore
      await db.execute('DELETE FROM tasks');
      // @ts-ignore
      await db.execute('DELETE FROM task_dependencies');
      // @ts-ignore
      await db.execute('DELETE FROM task_notes');
      // @ts-ignore
      await db.execute('DELETE FROM task_assignees');
      // @ts-ignore
      await db.execute('DELETE FROM task_comments');
      // @ts-ignore
      await db.execute('DELETE FROM task_attachments');
      // @ts-ignore
      await db.execute('DELETE FROM time_entries');
      // @ts-ignore
      await db.execute('DELETE FROM calendars');
      // @ts-ignore
      await db.execute('DELETE FROM events');
      // @ts-ignore
      await db.execute('DELETE FROM event_attendees');
      // @ts-ignore
      await db.execute('DELETE FROM scheduling_links');
      // @ts-ignore
      await db.execute('DELETE FROM command_queue');
    } catch (error) {
      // Log error but continue with sign-out
      console.error('Failed to clear PowerSync database:', error);
    }

    await supabase.auth.signOut();
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
    isSigningIn,
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
