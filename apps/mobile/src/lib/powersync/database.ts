/**
 * MODULE: PowerSync database initialization
 *
 * Responsibility:
 * Creates and exports the PowerSync database instance for mobile offline sync.
 *
 * Boundaries:
 * - Singleton instance management for the PowerSyncDatabase.
 * - Local SQLite storage configuration.
 * - Schema application from @life-os/mobile-data.
 *
 * Critical invariants:
 * - Database uses Supabase Auth session tokens for authentication.
 * - Schema MUST match @life-os/mobile-data powersyncSchema exactly.
 * - Database instance MUST be a singleton for the app lifecycle.
 *
 * Side effects:
 * - Initializes local SQLite database.
 * - Connects to PowerSync service for synchronization.
 *
 * Change risk:
 * - High. Data synchronization and offline functionality integrity.
 *
 * Links:
 * - packages/mobile-data/src/schema.ts
 * - apps/mobile/src/lib/supabase/client.ts
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: offline-sync, powersync, sqlite, mobile, supabase
 *
 * File:
 * - apps/mobile/src/lib/powersync/database.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { powersyncSchema } from '@life-os/mobile-data';
import { PowerSyncDatabase } from '@powersync/react-native';

/**
 * PowerSync database instance
 *
 * Singleton instance configured with:
 * - Schema from @life-os/mobile-data
 * - Local SQLite database for offline storage
 *
 * Note: PowerSync v2 API - connector setup deferred until sync is needed
 * Database is initialized automatically on first use
 */
export const db = new PowerSyncDatabase({
  database: { dbFilename: 'lifeos.db' },
  schema: powersyncSchema,
});

/**
 * Initialize PowerSync database
 *
 * Call this during app startup to ensure the database is ready for use.
 * Database is initialized automatically on first use in v2 API.
 */
export async function initializePowerSync(): Promise<void> {
  // Database is initialized automatically on first use
  // No explicit initialization needed for v2 API
}
