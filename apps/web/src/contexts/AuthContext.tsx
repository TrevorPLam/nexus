'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { apiClient } from '@life-os/api-client';

type WorkspaceState = 'loading' | 'no-membership' | 'selected';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  workspaceId: string | null;
  workspaceState: WorkspaceState;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>('loading');
  const supabase = createClient();

  const fetchWorkspaces = async () => {
    try {
      const response = (await apiClient.getWorkspaces()) as { workspaces: Array<{ id: string; name: string }> };
      const workspaces = response.workspaces || [];

      if (workspaces.length === 0) {
        setWorkspaceState('no-membership');
        setWorkspaceId(null);
      } else {
        // Auto-select first workspace (multi-workspace UI is out of scope)
        setWorkspaceState('selected');
        setWorkspaceId(workspaces[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      setWorkspaceState('no-membership');
      setWorkspaceId(null);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await fetchWorkspaces();
      } else {
        setWorkspaceState('no-membership');
        setWorkspaceId(null);
      }

      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchWorkspaces();
      } else {
        setWorkspaceState('no-membership');
        setWorkspaceId(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <AuthContext.Provider value={{ user, loading, workspaceId, workspaceState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
