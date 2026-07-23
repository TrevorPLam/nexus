/**
 * MODULE: PowerSync provider
 *
 * Responsibility:
 * Provides PowerSync database context to the mobile application.
 *
 * Boundaries:
 * - Context provider for the PowerSync database instance.
 * - Handles asynchronous initialization and error state.
 *
 * Critical invariants:
 * - Database instance MUST be a singleton for the app lifecycle.
 * - Database MUST be initialized before any components use it.
 *
 * Side effects:
 * - Initializes PowerSync database on app startup.
 *
 * Change risk:
 * - High. Data synchronization and offline functionality integrity.
 *
 * Links:
 * - apps/mobile/src/lib/powersync/database.ts
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: presentation
 * - stability: stable
 * - concerns: offline-sync, powersync, react-context, mobile
 *
 * File:
 * - apps/mobile/src/lib/powersync/provider.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

import { db, initializePowerSync } from './database';

interface PowerSyncContextValue {
  db: typeof db;
  isInitialized: boolean;
  error: Error | null;
}

const PowerSyncContext = createContext<PowerSyncContextValue | null>(null);

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await initializePowerSync();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  const value: PowerSyncContextValue = {
    db,
    isInitialized,
    error,
  };

  return <PowerSyncContext.Provider value={value}>{children}</PowerSyncContext.Provider>;
}

export function usePowerSync(): PowerSyncContextValue {
  const context = useContext(PowerSyncContext);
  if (!context) {
    throw new Error('usePowerSync must be used within PowerSyncProvider');
  }
  return context;
}
