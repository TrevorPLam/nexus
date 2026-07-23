/**
 * MODULE: Mobile Root Layout
 *
 * Responsibility:
 * Root Expo Router layout for the mobile application. Wraps every screen in the
 * AuthProvider and PowerSyncProvider, enabling authentication and offline-first
 * data for the entire app.
 *
 * Boundaries:
 * - Top-level provider injection only. Individual screens are configured via Stack.Screen.
 * - No business logic or data fetching belongs here.
 *
 * Critical invariants:
 * - AuthProvider and PowerSyncProvider must wrap all routes.
 * - The Stack navigator must declare the main app routes (index, work, calendar).
 *
 * Side effects:
 * - Initializes auth and PowerSync contexts on app startup.
 *
 * Change risk:
 * - High. Errors here prevent the mobile app from starting or break sync/auth.
 *
 * Links:
 * - apps/mobile/src/contexts/AuthContext.tsx
 * - apps/mobile/src/lib/powersync/provider.tsx
 * - apps/mobile/src/lib/powersync/database.ts
 *
 * Tags:
 * - domain: mobile
 * - risk: high
 * - layer: presentation
 * - stability: stable
 * - concerns: expo-router, layout, providers
 *
 * File:
 * - apps/mobile/app/_layout.tsx
 *
 * Last updated:
 * - July 22, 2026
 */

import { Stack } from 'expo-router';

import { AuthProvider } from '../src/contexts/AuthContext';
import { PowerSyncProvider } from '../src/lib/powersync/provider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PowerSyncProvider>
        <Stack screenOptions={{ headerShown: true }}>
          <Stack.Screen name="index" options={{ title: 'Life OS' }} />
          <Stack.Screen name="work/index" options={{ title: 'Work' }} />
          <Stack.Screen name="calendar/index" options={{ title: 'Calendar' }} />
        </Stack>
      </PowerSyncProvider>
    </AuthProvider>
  );
}
