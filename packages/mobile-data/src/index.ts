/**
 * MODULE: Mobile Data Exports
 *
 * Responsibility:
 * Re-exports the PowerSync SQLite schema used by the mobile app for offline-first
 * synchronization with the backend PostgreSQL database.
 *
 * Boundaries:
 * - Pure barrel export; the schema definition lives in schema.ts.
 * - No client initialization or sync logic belongs here.
 *
 * Critical invariants:
 * - The re-exported schema MUST remain in sync with packages/database schema.
 * - Mismatched columns or table names will cause PowerSync sync failures.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. Errors here break offline sync and can lead to data loss on mobile.
 *
 * Links:
 * - packages/mobile-data/src/schema.ts
 *
 * Tags:
 * - domain: mobile
 * - risk: high
 * - layer: persistence
 * - stability: stable
 * - concerns: powersync, offline, barrel-export
 *
 * File:
 * - packages/mobile-data/src/index.ts
 *
 * Last updated:
 * - July 23, 2026
 */

export * from './schema';
