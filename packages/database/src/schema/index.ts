/**
 * MODULE: Database Schema Exports
 *
 * Responsibility:
 * Re-exports the Drizzle ORM schema for core identity/tenant, work, and calendar
 * domains, enabling migration generation and type inference across the monorepo.
 *
 * Boundaries:
 * - Pure barrel export; no query logic or migrations.
 * - Domain tables are defined in core.ts, work.ts, and calendar.ts.
 *
 * Critical invariants:
 * - All user/workspace-scoped tables must be represented here for Drizzle Kit.
 * - Column additions or renames here require a corresponding migration.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. Schema changes affect migrations, generated types, and RLS policies.
 *
 * Links:
 * - packages/database/src/schema/core.ts
 * - packages/database/src/schema/work.ts
 * - packages/database/src/schema/calendar.ts
 * - packages/database/drizzle.config.ts
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: persistence
 * - stability: stable
 * - concerns: schema, drizzle, barrel-export
 *
 * File:
 * - packages/database/src/schema/index.ts
 *
 * Last updated:
 * - July 22, 2026
 */

export * from './core.js';
export * from './work.js';
export * from './calendar.js';
export * from './contacts.js';
